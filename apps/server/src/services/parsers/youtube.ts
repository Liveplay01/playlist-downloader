import axios from 'axios';
import { spawn } from 'child_process';
import { Track, PlaylistMeta } from '@playlist-dl/shared';
import { config } from '../../config.js';

function extractPlaylistId(url: string): string {
  const match = url.match(/[?&]list=([^&]+)/);
  if (!match) throw new Error('Could not extract YouTube playlist ID from URL');
  return match[1];
}

async function parseViaApi(listId: string): Promise<Track[]> {
  const key = config.YOUTUBE_API_KEY;
  const tracks: Track[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId: listId,
      maxResults: '50',
      key: key!,
    };
    if (pageToken) params.pageToken = pageToken;
    const resp = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', { params });
    for (const item of resp.data.items) {
      const s = item.snippet;
      if (!s || s.title === 'Private video' || s.title === 'Deleted video') continue;
      tracks.push({
        id: `youtube:${s.resourceId?.videoId ?? item.id}`,
        title: s.title,
        artist: s.videoOwnerChannelTitle ?? '',
        album: '',
        durationMs: 0,
        platform: 'youtube',
        searchQuery: s.title,
      });
    }
    pageToken = resp.data.nextPageToken;
  } while (pageToken);

  return tracks;
}

function parseViaYtDlp(url: string): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--flat-playlist', '--dump-json', '--no-warnings', url]);
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on('data', (d: Buffer) => chunks.push(d));
    proc.stderr.on('data', (d: Buffer) => errChunks.push(d));
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`yt-dlp exited ${code}: ${Buffer.concat(errChunks).toString()}`));
      const lines = Buffer.concat(chunks).toString().split('\n').filter(Boolean);
      const tracks: Track[] = lines.map(line => {
        const m = JSON.parse(line);
        return {
          id: `youtube:${m.id}`,
          title: m.title,
          artist: m.uploader ?? '',
          album: '',
          durationMs: (m.duration ?? 0) * 1000,
          platform: 'youtube' as const,
          searchQuery: m.title,
        };
      });
      resolve(tracks);
    });
  });
}

export async function parseYouTubeMusic(url: string): Promise<PlaylistMeta> {
  const listId = extractPlaylistId(url);
  let tracks: Track[];
  let title = 'YouTube Playlist';

  if (config.YOUTUBE_API_KEY) {
    tracks = await parseViaApi(listId);
    try {
      const resp = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
        params: { part: 'snippet', id: listId, key: config.YOUTUBE_API_KEY },
      });
      title = resp.data.items?.[0]?.snippet?.title ?? title;
    } catch {}
  } else {
    tracks = await parseViaYtDlp(url);
  }

  return { title, platform: 'youtube', trackCount: tracks.length, tracks };
}
