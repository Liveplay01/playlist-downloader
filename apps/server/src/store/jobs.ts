import { JobState, JobStatus, TrackProgress, PlaylistMeta, ProgressEvent } from '@playlist-dl/shared';

const jobs = new Map<string, JobState>();
const subscribers = new Map<string, Set<(event: ProgressEvent) => void>>();
const abortControllers = new Map<string, AbortController>();

export function createJob(jobId: string, playlist: PlaylistMeta): JobState {
  const state: JobState = {
    jobId,
    playlistTitle: playlist.title,
    totalTracks: playlist.tracks.length,
    completedTracks: 0,
    failedTracks: 0,
    status: 'queued',
    tracks: playlist.tracks.map(t => ({
      trackId: t.id,
      title: t.title,
      artist: t.artist,
      status: 'pending',
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(jobId, state);
  return state;
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function updateJobStatus(jobId: string, status: JobStatus, downloadUrl?: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  job.updatedAt = Date.now();
  if (downloadUrl) job.downloadUrl = downloadUrl;
  emit(jobId, { type: 'job_update', job: { ...job } });
}

export function updateTrack(jobId: string, track: TrackProgress): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const idx = job.tracks.findIndex(t => t.trackId === track.trackId);
  if (idx !== -1) job.tracks[idx] = track;
  if (track.status === 'done') job.completedTracks++;
  if (track.status === 'failed') job.failedTracks++;
  job.updatedAt = Date.now();
  emit(jobId, { type: 'track_update', jobId, track });
  emit(jobId, { type: 'job_update', job: { ...job } });
}

export function subscribe(jobId: string, cb: (e: ProgressEvent) => void): () => void {
  if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
  subscribers.get(jobId)!.add(cb);
  return () => subscribers.get(jobId)?.delete(cb);
}

function emit(jobId: string, event: ProgressEvent): void {
  subscribers.get(jobId)?.forEach(cb => cb(event));
}

export function createAbortController(jobId: string): AbortController {
  const ctrl = new AbortController();
  abortControllers.set(jobId, ctrl);
  return ctrl;
}

export function abortJob(jobId: string): void {
  abortControllers.get(jobId)?.abort();
  abortControllers.delete(jobId);
}

export function deleteJob(jobId: string): void {
  abortJob(jobId);
  jobs.delete(jobId);
  subscribers.delete(jobId);
}
