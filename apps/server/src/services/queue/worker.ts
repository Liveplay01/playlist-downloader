import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { Quality, Track } from '@playlist-dl/shared';
import { downloadTrack } from '../lucida/downloader.js';
import { updateTrack, updateJobStatus, getJob, createAbortController } from '../../store/jobs.js';
import { zipJobDownloads } from '../packager/zipper.js';
import { config, DOWNLOADS_DIR } from '../../config.js';

const limit = pLimit(config.MAX_CONCURRENT_DOWNLOADS);
const TRACK_TIMEOUT_MS = 300_000;

export async function processJob(jobId: string, tracks: Track[], quality: Quality): Promise<void> {
  const ctrl = createAbortController(jobId);
  updateJobStatus(jobId, 'running');

  const tasks = tracks.map(track =>
    limit(async () => {
      if (ctrl.signal.aborted) return;

      updateTrack(jobId, {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        status: 'searching',
      });

      // Per-track timeout: abort if download takes longer than 1 minute
      const trackCtrl = new AbortController();
      const timeoutId = setTimeout(() => trackCtrl.abort(), TRACK_TIMEOUT_MS);
      const combined = AbortSignal.any([ctrl.signal, trackCtrl.signal]);

      try {
        const result = await downloadTrack(track, jobId, quality,
          (status) => {
            if (ctrl.signal.aborted) return;
            updateTrack(jobId, {
              trackId: track.id,
              title: track.title,
              artist: track.artist,
              status: status as 'searching' | 'downloading',
            });
          },
          combined
        );

        clearTimeout(timeoutId);
        if (ctrl.signal.aborted) return;

        updateTrack(jobId, {
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          status: 'done',
          quality: result.quality,
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (ctrl.signal.aborted) return;

        const timedOut = trackCtrl.signal.aborted;
        const message = timedOut
          ? 'Download timed out — try lucida.to'
          : err instanceof Error ? err.message : 'Unknown error';

        updateTrack(jobId, {
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          status: 'failed',
          errorMessage: message,
        });
      }
    })
  );

  await Promise.all(tasks);

  if (ctrl.signal.aborted) return;

  updateJobStatus(jobId, 'zipping');
  try {
    const job = getJob(jobId);
    const zipPath = await zipJobDownloads(jobId, job?.playlistTitle ?? 'playlist');
    fs.rm(path.join(DOWNLOADS_DIR, jobId), { recursive: true, force: true }, () => {});

    if (ctrl.signal.aborted) { fs.rm(zipPath, { force: true }, () => {}); return; }

    updateJobStatus(jobId, 'done', `/api/jobs/${jobId}/download`);
  } catch (err) {
    if (ctrl.signal.aborted) return;
    console.error('ZIP error:', err instanceof Error ? err.message : err);
    updateJobStatus(jobId, 'failed');
  }
}
