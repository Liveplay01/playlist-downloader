import { PlaylistMeta } from '@playlist-dl/shared';
import { parseSpotify } from './spotify.js';
import { parseYouTubeMusic } from './youtube.js';
import { parseAppleMusic } from './apple.js';
import { parseAmazonMusic } from './amazon.js';

export async function parsePlaylistUrl(url: string): Promise<PlaylistMeta> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const host = parsed.hostname.replace('www.', '');

  if (host === 'open.spotify.com') return parseSpotify(url);
  if (host === 'music.youtube.com' || host === 'youtube.com') return parseYouTubeMusic(url);
  if (host === 'music.apple.com') return parseAppleMusic(url);
  if (host.startsWith('music.amazon.')) return parseAmazonMusic(url);

  throw new Error(`Unsupported platform: ${host}. Supported: Spotify, YouTube Music, Apple Music, Amazon Music`);
}
