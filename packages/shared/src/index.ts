export type Platform = 'spotify' | 'youtube' | 'applemusic' | 'amazon';

export type Quality = 'lossless' | '320' | '256' | '128';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  platform: Platform;
  searchQuery: string;
}

export interface PlaylistMeta {
  title: string;
  platform: Platform;
  trackCount: number;
  tracks: Track[];
}

export type TrackStatus = 'pending' | 'searching' | 'downloading' | 'done' | 'failed';

export interface TrackProgress {
  trackId: string;
  title: string;
  artist: string;
  status: TrackStatus;
  errorMessage?: string;
  quality?: string;
}

export type JobStatus = 'queued' | 'running' | 'zipping' | 'done' | 'failed';

export interface JobState {
  jobId: string;
  playlistTitle: string;
  totalTracks: number;
  completedTracks: number;
  failedTracks: number;
  status: JobStatus;
  tracks: TrackProgress[];
  downloadUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type ProgressEvent =
  | { type: 'job_update'; job: JobState }
  | { type: 'track_update'; jobId: string; track: TrackProgress }
  | { type: 'done'; jobId: string; downloadUrl: string }
  | { type: 'error'; jobId: string; message: string };
