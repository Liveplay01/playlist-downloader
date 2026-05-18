import axios from 'axios';
import { parse as parseHtml } from 'node-html-parser';
import { Track, PlaylistMeta } from '@playlist-dl/shared';

export async function parseAppleMusic(url: string): Promise<PlaylistMeta> {
  const resp = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    timeout: 15_000,
  });

  const root = parseHtml(resp.data as string);
  const scriptEl = root.querySelector('script#serialized-server-data');
  if (!scriptEl) throw new Error('Could not find Apple Music data on page');

  const raw = JSON.parse(scriptEl.text);
  // Navigate the deeply nested Apple Music JSON structure
  const sections: unknown[] = raw?.[0]?.data?.sections ?? [];
  const tracks: Track[] = [];
  let playlistTitle = 'Apple Music Playlist';

  try {
    playlistTitle = raw?.[0]?.data?.headerButtonItems?.[0]?.title ?? playlistTitle;
  } catch {}

  for (const section of sections) {
    const items: unknown[] = (section as { items?: unknown[] }).items ?? [];
    for (const item of items) {
      const i = item as {
        id?: string;
        title?: string;
        artistName?: string;
        albumName?: string;
        durationInMillis?: number;
      };
      if (!i.title) continue;
      tracks.push({
        id: `applemusic:${i.id ?? Math.random().toString(36).slice(2)}`,
        title: i.title,
        artist: i.artistName ?? '',
        album: i.albumName ?? '',
        durationMs: i.durationInMillis ?? 0,
        platform: 'applemusic',
        searchQuery: `${i.artistName ?? ''} - ${i.title}`,
      });
    }
  }

  if (tracks.length === 0) throw new Error('No tracks found in Apple Music playlist');
  return { title: playlistTitle, platform: 'applemusic', trackCount: tracks.length, tracks };
}
