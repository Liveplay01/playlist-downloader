import { parse as parseHtml } from 'node-html-parser';
import type { Track, PlaylistMeta } from '@playlist-dl/shared';
import { browserManager } from '../lucida/browser.js';

export async function parseAmazonMusic(url: string): Promise<PlaylistMeta> {
  const context = await browserManager.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait for track rows or any music-* custom element to appear
    await page.waitForSelector(
      'music-list-row, music-image-row, [class*="trackTitle"], [class*="track-row"]',
      { timeout: 20_000 }
    ).catch(() => {});

    await page.waitForTimeout(3000);

    const pageTitle = await page.title().catch(() => '');

    // Detect login wall
    if (/sign.?in|log.?in|anmelden|connexion/i.test(pageTitle)) {
      throw new Error('Amazon Music requires a login to view this playlist in a headless browser.');
    }

    // Get the fully-rendered HTML and parse server-side — avoids page.evaluate() entirely
    const html = await page.content();
    const root = parseHtml(html);

    const playlistTitle = pageTitle
      .replace(/\s*[-–|]\s*Amazon Music.*$/i, '')
      .trim() || 'Amazon Music Playlist';

    const tracks: Track[] = [];

    // ── Strategy 1: music-list-row custom elements ──────────────────────────
    const listRows = root.querySelectorAll('music-list-row');
    if (listRows.length > 0) {
      for (const row of listRows) {
        // Try element attributes first — more reliable than child label indices
        let title = row.getAttribute('primary-text')?.trim() ?? '';
        let secondaryRaw = row.getAttribute('secondary-text')?.trim() ?? '';

        // Fallback: read from music-text-label children by index
        if (!title) {
          const labels = row.querySelectorAll('music-text-label');
          title = labels[0]?.text?.trim() ?? '';
          secondaryRaw = labels[1]?.text?.trim() ?? '';
        }

        // Secondary text is often "Artist · Album" — split on the separator
        const parts = secondaryRaw.split(/\s*[·•]\s*/);
        const artist = parts[0]?.trim() ?? '';
        const album = parts[1]?.trim() ?? '';

        const durText = row.querySelector('[class*="duration"]')?.text ?? '';
        if (title) tracks.push(makeTrack(tracks.length, title, artist, album, parseDuration(durText)));
      }
      if (tracks.length > 0) return finish(playlistTitle, tracks);
    }

    // ── Strategy 2: music-image-row (another Amazon Music component variant) ─
    const imageRows = root.querySelectorAll('music-image-row');
    if (imageRows.length > 0) {
      for (const row of imageRows) {
        const title = row.getAttribute('primary-text')?.trim()
          ?? row.querySelector('[slot="primary-text"]')?.text?.trim() ?? '';
        const secondaryRaw = row.getAttribute('secondary-text')?.trim()
          ?? row.querySelector('[slot="secondary-text"]')?.text?.trim() ?? '';
        // Same "Artist · Album" split
        const parts = secondaryRaw.split(/\s*[·•]\s*/);
        const artist = parts[0]?.trim() ?? '';
        const album = parts[1]?.trim() ?? '';
        if (title) tracks.push(makeTrack(tracks.length, title, artist, album, 0));
      }
      if (tracks.length > 0) return finish(playlistTitle, tracks);
    }

    // ── Strategy 3: generic class-name heuristics ───────────────────────────
    const titleEls = root.querySelectorAll(
      '[class*="trackTitle"],[class*="track-title"],[class*="TrackTitle"]'
    );
    for (const el of titleEls) {
      const title = el.text?.trim() ?? '';
      if (!title) continue;
      // Walk up to find a row container, then look for artist text
      const row = el.closest('[class*="row"],[class*="Row"],[class*="item"],[class*="Item"]');
      const artistEl = row?.querySelector('[class*="artist"],[class*="Artist"],[class*="secondary"],[class*="Secondary"]');
      const artist = artistEl?.text?.trim() ?? '';
      tracks.push(makeTrack(tracks.length, title, artist, '', 0));
    }
    if (tracks.length > 0) return finish(playlistTitle, tracks);

    // ── Strategy 4: table rows ──────────────────────────────────────────────
    const tableRows = root.querySelectorAll('tr');
    for (const row of tableRows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) continue;
      const titleEl = cells[1].querySelector('[class*="title"],[class*="name"]') ?? cells[1];
      const title = titleEl.text?.trim() ?? '';
      const artist = cells[2]?.text?.trim() ?? '';
      const durText = cells[cells.length - 1]?.text ?? '';
      if (title && title.length < 200) {
        tracks.push(makeTrack(tracks.length, title, artist, '', parseDuration(durText)));
      }
    }
    if (tracks.length > 0) return finish(playlistTitle, tracks);

    // Collect diagnostic info to help debug selector misses
    const tagCounts: Record<string, number> = {};
    for (const el of root.querySelectorAll('*')) {
      tagCounts[el.tagName] = (tagCounts[el.tagName] ?? 0) + 1;
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t, n]) => `${t}×${n}`)
      .join(', ');

    throw new Error(
      `No tracks found in Amazon Music playlist. Page title: "${pageTitle}". ` +
      `Top elements: ${topTags}. The playlist may be private or the DOM structure has changed.`
    );
  } finally {
    await context.close();
  }
}

function parseDuration(text: string): number {
  const m = (text ?? '').trim().match(/^(\d+):(\d{2})$/);
  if (!m) return 0;
  return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 1000;
}

function makeTrack(index: number, title: string, artist: string, album: string, durationMs: number): Track {
  return {
    id: `amazon:${index}`,
    title,
    artist,
    album,
    durationMs,
    platform: 'amazon',
    searchQuery: `${artist} - ${title}`.replace(/^\s*-\s*/, '').trim(),
  };
}

function finish(title: string, tracks: Track[]): PlaylistMeta {
  return { title, platform: 'amazon', trackCount: tracks.length, tracks };
}
