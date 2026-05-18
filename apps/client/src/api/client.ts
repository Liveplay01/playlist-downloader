import type { PlaylistMeta, JobState, Quality, Track } from '@playlist-dl/shared';

export function getBackendUrl(): string {
  return (localStorage.getItem('backendUrl') || 'http://localhost:4500').replace(/\/$/, '');
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(getBackendUrl() + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function parsePlaylist(url: string): Promise<{ playlistMeta: PlaylistMeta }> {
  return req('/api/playlist/parse', { method: 'POST', body: JSON.stringify({ url }) });
}

export function createJob(
  url: string,
  quality: Quality,
  playlist: { title: string; tracks: Track[] }
): Promise<{ jobId: string; playlistTitle: string; totalTracks: number; tracks: Track[] }> {
  return req('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ url, quality, playlistTitle: playlist.title, tracks: playlist.tracks }),
  });
}

export function getJob(jobId: string): Promise<JobState> {
  return req(`/api/jobs/${jobId}`);
}

export function cancelJob(jobId: string): Promise<void> {
  return req(`/api/jobs/${jobId}`, { method: 'DELETE' });
}
