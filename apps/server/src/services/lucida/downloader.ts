import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import NodeID3 from 'node-id3';
import type { Track, Quality } from '@playlist-dl/shared';
import { DOWNLOADS_DIR } from '../../config.js';

export interface DownloadResult {
  filePath: string;
  fileName: string;
  quality: string;
}

function safeNames(track: Track) {
  return {
    safeTitle: track.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80),
    safeArtist: track.artist.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 40),
  };
}

function trackSourceUrl(track: Track): string {
  if (track.platform === 'spotify')
    return `https://open.spotify.com/track/${track.id.replace('spotify:', '')}`;
  if (track.platform === 'youtube')
    return `https://www.youtube.com/watch?v=${track.id.replace('youtube:', '')}`;
  return track.searchQuery;
}

function runProcess(cmd: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const onAbort = () => {
      proc.kill('SIGTERM');
      reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    proc.stdout.on('data', (d: Buffer) => lines.push(d.toString()));
    proc.stderr.on('data', (d: Buffer) => lines.push(d.toString()));
    proc.on('error', err => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error(`${cmd} not found: ${err.message}`));
    });
    proc.on('close', code => {
      signal?.removeEventListener('abort', onAbort);
      const out = lines.join('');
      if (code !== 0) return reject(new Error(`${cmd} exit ${code}: ${out.slice(-300)}`));
      resolve(out);
    });
  });
}

// ── Metadata embedding ───────────────────────────────────────────────────────
async function embedMetadata(filePath: string, track: Track): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.mp3') {
    // node-id3 reads/writes ID3 tags in-place, preserving all existing frames
    // (including APIC cover art). Much more reliable than ffmpeg for this.
    try {
      const existing = NodeID3.read(filePath);
      const tags: NodeID3.Tags = { ...existing };
      if (track.title)  tags.title = track.title;
      if (track.artist) { tags.artist = track.artist; tags.performerInfo = track.artist; }
      if (track.album)  tags.album = track.album;
      const result = NodeID3.write(tags, filePath);
      if (result !== true) throw new Error(String(result));
    } catch (err) {
      console.warn(`[metadata] could not embed tags for "${track.title}": ${err instanceof Error ? err.message : err}`);
    }
    return;
  }

  // FLAC / other formats — ffmpeg stream copy with metadata override
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  const tmpPath = path.join(dir, `${base}.tmp${ext}`);

  const metaArgs: string[] = [
    '-metadata', `title=${track.title}`,
    '-metadata', `artist=${track.artist}`,
    '-metadata', `album_artist=${track.artist}`,
  ];
  if (track.album) metaArgs.push('-metadata', `album=${track.album}`);

  try {
    await runProcess('ffmpeg', [
      '-i', filePath,
      '-map', '0',
      '-map_metadata', '0',
      ...metaArgs,
      '-c', 'copy',
      '-y',
      tmpPath,
    ]);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    fs.rm(tmpPath, { force: true }, () => {});
    console.warn(`[metadata] could not embed tags for "${track.title}": ${err instanceof Error ? err.message : err}`);
  }
}

// ── 1. yams.tf ───────────────────────────────────────────────────────────────
// Free lossless source, no account needed. Only works with Spotify URLs.
// Circuit breaker: after 3 consecutive failures, skip for 10 minutes.
const YAMS_QUALITY: Record<Quality, number> = {
  lossless: 4,
  '320': 2,
  '256': 1,
  '128': 0,
};

let yamsFailures = 0;
let yamsSkipUntil = 0;

async function downloadViaYams(
  track: Track,
  jobDir: string,
  preferredQuality: Quality,
  signal?: AbortSignal
): Promise<DownloadResult | null> {
  // Only works with Spotify URLs — skip other platforms immediately
  if (track.platform !== 'spotify') return null;

  // Circuit breaker
  if (Date.now() < yamsSkipUntil) {
    console.log('[yams] skipping (circuit breaker active)');
    return null;
  }

  const sourceUrl = trackSourceUrl(track);
  console.log(`[yams] submitting: "${track.searchQuery}"`);

  try {
    // Submit job — short timeout so a downed yams fails fast and yt-dlp can run
    const submitSignal = AbortSignal.any([
      signal ?? new AbortController().signal,
      AbortSignal.timeout(12_000),
    ]);
    const submitRes = await fetch('https://yams.tf/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: sourceUrl,
        quality: YAMS_QUALITY[preferredQuality],
        host: 'buzzheavier',
        account: 'none',
      }),
      signal: submitSignal,
    });

    if (!submitRes.ok) {
      console.log(`[yams] submit failed: HTTP ${submitRes.status}`);
      yamsFailures++;
      if (yamsFailures >= 3) { yamsSkipUntil = Date.now() + 10 * 60_000; yamsFailures = 0; }
      return null;
    }

    const { id } = await submitRes.json() as { id?: string };
    if (!id) { console.log('[yams] no job ID'); return null; }

    console.log(`[yams] job ${id} — polling…`);

    // Poll until done (max 60s)
    let downloadUrl: string | null = null;
    for (let i = 0; i < 20; i++) {
      if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
      await new Promise(r => setTimeout(r, 3000));

      const pollRes = await fetch(`https://yams.tf/api?id=${id}`, { signal });
      const poll = await pollRes.json() as { status: string; url?: string };
      console.log(`[yams] status: ${poll.status}`);

      if (poll.status === 'done' && poll.url) { downloadUrl = poll.url; break; }
      if (poll.status === 'error') {
        console.log('[yams] job errored');
        yamsFailures++;
        if (yamsFailures >= 3) { yamsSkipUntil = Date.now() + 10 * 60_000; yamsFailures = 0; }
        return null;
      }
    }

    if (!downloadUrl) { console.log('[yams] timed out'); return null; }

    // Download file
    const dlRes = await fetch(downloadUrl, { signal });
    if (!dlRes.ok || !dlRes.body) {
      console.log(`[yams] download failed: HTTP ${dlRes.status}`);
      return null;
    }

    const disposition = dlRes.headers.get('content-disposition') ?? '';
    const suggested = disposition.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)/i)?.[1]?.trim() ?? '';
    const ext = path.extname(suggested) || (downloadUrl.includes('.flac') ? '.flac' : '.mp3');

    const { safeTitle, safeArtist } = safeNames(track);
    const fileName = `${safeArtist} - ${safeTitle}${ext}`;
    const filePath = path.join(jobDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    try {
      await pipeline(Readable.fromWeb(dlRes.body as any), writeStream);
    } catch (err) {
      fs.rm(filePath, { force: true }, () => {});
      throw err;
    }

    const quality = ext === '.flac' ? 'FLAC' : ext === '.mp3' ? 'MP3' : ext.slice(1).toUpperCase();
    yamsFailures = 0; // reset on success
    await embedMetadata(filePath, track);
    console.log(`[yams] ✓ ${fileName} (${quality})`);
    return { filePath, fileName, quality };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.error(`[yams] error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ── 2. yt-dlp ────────────────────────────────────────────────────────────────
async function downloadViaYtDlp(
  track: Track,
  jobDir: string,
  signal?: AbortSignal
): Promise<DownloadResult> {
  const { safeTitle, safeArtist } = safeNames(track);
  const fileName = `${safeArtist} - ${safeTitle}.mp3`;
  const filePath = path.join(jobDir, fileName);

  console.log(`[ytdlp] "${track.searchQuery}"`);

  await runProcess('yt-dlp', [
    `ytsearch1:${track.searchQuery}`,
    '-f', 'bestaudio',
    '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
    '--embed-thumbnail',
    '--embed-metadata',   // baseline title/artist from YouTube — overridden below if we have better data
    '--no-playlist', '--no-progress', '--no-warnings', '--no-cache-dir',
    '-o', filePath,
  ], signal);

  let resolvedPath = filePath;
  if (!fs.existsSync(filePath)) {
    const files = fs.readdirSync(jobDir)
      .map(f => path.join(jobDir, f))
      .filter(f => fs.statSync(f).isFile())
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (files.length === 0) throw new Error('yt-dlp: no output file found');
    resolvedPath = files[0];
  }

  await embedMetadata(resolvedPath, track);
  console.log(`[ytdlp] ✓ ${path.basename(resolvedPath)} (MP3)`);
  return { filePath: resolvedPath, fileName: path.basename(resolvedPath), quality: 'MP3' };
}

// ── Main entry point ─────────────────────────────────────────────────────────
export async function downloadTrack(
  track: Track,
  jobId: string,
  preferredQuality: Quality,
  onProgress?: (status: string) => void,
  signal?: AbortSignal
): Promise<DownloadResult> {
  const jobDir = path.join(DOWNLOADS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  onProgress?.('searching');
  console.log(`[dl] ▶ "${track.searchQuery}" (${track.platform})`);

  if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });

  // ── Priority 1: yams.tf (free FLAC, no account) ───────────────────────────
  onProgress?.('downloading');
  const yamsResult = await downloadViaYams(track, jobDir, preferredQuality, signal);
  if (yamsResult) return yamsResult;

  if (signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });

  // ── Priority 2: yt-dlp (Opus 251k, always works) ─────────────────────────
  console.log(`[dl] falling back to yt-dlp for: "${track.searchQuery}"`);
  return downloadViaYtDlp(track, jobDir, signal);
}
