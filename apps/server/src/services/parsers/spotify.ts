import { Track, PlaylistMeta } from '@playlist-dl/shared';
import { browserManager } from '../lucida/browser.js';

function extractPlaylistId(url: string): string {
  const match = url.match(/playlist\/([A-Za-z0-9]+)/);
  if (!match) throw new Error('Could not extract Spotify playlist ID from URL');
  return match[1];
}

// ── Response parsers for both API formats ────────────────────────────────────

// REST  — api.spotify.com  — { items: [{ track: { id, name, artists, album, duration_ms } }] }
function fromRestItems(items: unknown[]): Track[] {
  const tracks: Track[] = [];
  for (const raw of items) {
    const t = (raw as { track?: Record<string, unknown> }).track;
    if (!t || typeof t.name !== 'string' || t.type === 'episode') continue;
    const artists = (t.artists as { name: string }[] | undefined) ?? [];
    tracks.push({
      id: `spotify:${t.id ?? ''}`,
      title: t.name,
      artist: artists.map(a => a.name).join(', '),
      album: (t.album as { name?: string } | undefined)?.name ?? '',
      durationMs: (t.duration_ms as number | undefined) ?? 0,
      platform: 'spotify',
      searchQuery: `${artists[0]?.name ?? ''} - ${t.name}`.replace(/^\s*-\s*/, '').trim(),
    });
  }
  return tracks;
}

// GraphQL — api-partner.spotify.com — { data: { playlistV2: { content: { items: [...] } } } }
function fromGqlItems(items: unknown[]): Track[] {
  const tracks: Track[] = [];
  for (const raw of items) {
    const data = (raw as Record<string, unknown>)?.itemV2 as Record<string, unknown> | undefined;
    const tu = data?.data as Record<string, unknown> | undefined;
    // trackUnion or just inlined track fields
    const t = (tu?.trackUnion ?? tu) as Record<string, unknown> | undefined;
    if (!t || typeof t.name !== 'string') continue;

    const uri = String(t.uri ?? '');
    const trackId = uri.split(':').pop() ?? '';
    const artistItems =
      (t.firstArtist as { items?: { profile?: { name?: string } }[] } | undefined)?.items ??
      (t.artists as { items?: { profile?: { name?: string } }[] } | undefined)?.items ?? [];
    const artist = artistItems.map(a => a.profile?.name ?? '').filter(Boolean).join(', ');
    const album = (t.albumOfTrack as { name?: string } | undefined)?.name ?? '';
    const durationMs =
      (t.duration as { totalMilliseconds?: number } | undefined)?.totalMilliseconds ?? 0;

    if (!t.name) continue;
    tracks.push({
      id: `spotify:${trackId}`,
      title: t.name,
      artist,
      album,
      durationMs,
      platform: 'spotify',
      searchQuery: `${artist} - ${t.name}`.replace(/^\s*-\s*/, '').trim(),
    });
  }
  return tracks;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export async function parseSpotify(url: string): Promise<PlaylistMeta> {
  const id = extractPlaylistId(url);
  const context = await browserManager.newContext();
  const page = await context.newPage();

  try {
    let title = 'Spotify Playlist';
    const restItems: unknown[] = [];
    const gqlItems: unknown[] = [];
    let gotData = false;
    const dataReady = new Promise<void>(resolve => {
      page.on('response', async response => {
        const respUrl = response.url();
        if (response.status() !== 200) return;
        if (!respUrl.includes('spotify.com')) return;

        try {
          const ct = response.headers()['content-type'] ?? '';
          if (!ct.includes('json')) return;

          const json = await response.json() as Record<string, unknown>;

          // REST: api.spotify.com/v1/playlists/{id}/tracks
          if (Array.isArray(json.items) && (json.items as unknown[]).length > 0) {
            restItems.push(...(json.items as unknown[]));
            if (!gotData) { gotData = true; resolve(); }
          }

          // REST: playlist name
          if (typeof json.name === 'string' && json.tracks) title = json.name;

          // GraphQL: api-partner.spotify.com
          const playlist = (json.data as Record<string, unknown> | undefined)?.playlistV2 as Record<string, unknown> | undefined;
          if (playlist) {
            if (typeof playlist.name === 'string') title = playlist.name;
            const contentItems = (playlist.content as Record<string, unknown> | undefined)?.items;
            if (Array.isArray(contentItems) && contentItems.length > 0) {
              gqlItems.push(...contentItems);
              if (!gotData) { gotData = true; resolve(); }
            }
          }
        } catch { /* ignore parse errors */ }
      });
    });

    await page.goto(`https://open.spotify.com/playlist/${id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait for the first batch of track data (max 20 s)
    await Promise.race([
      dataReady,
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('no_data')), 20_000)),
    ]).catch(err => {
      if (err?.message === 'no_data') throw new Error('Could not load playlist data — make sure the playlist is public');
      throw err;
    });

    // Give the player a moment to fire additional paginated requests
    await page.waitForTimeout(3_000);

    const tracks =
      gqlItems.length > 0 ? fromGqlItems(gqlItems) :
      restItems.length > 0 ? fromRestItems(restItems) : [];

    if (tracks.length === 0) {
      throw new Error('Playlist appears to be empty or could not be read');
    }

    return { title, platform: 'spotify', trackCount: tracks.length, tracks };
  } finally {
    await context.close();
  }
}
