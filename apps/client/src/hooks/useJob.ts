import { useEffect, useState } from 'react';
import type { JobState, ProgressEvent } from '@playlist-dl/shared';
import { getBackendUrl } from '../api/client';

export function useJob(jobId: string | null) {
  const [jobState, setJobState] = useState<JobState | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`${getBackendUrl()}/api/jobs/${jobId}/progress`);

    es.onmessage = (e) => {
      const event: ProgressEvent = JSON.parse(e.data);

      if (event.type === 'job_update') {
        setJobState(event.job);
      } else if (event.type === 'track_update') {
        setJobState(prev =>
          prev
            ? {
                ...prev,
                tracks: prev.tracks.map(t =>
                  t.trackId === event.track.trackId ? event.track : t
                ),
              }
            : prev
        );
      } else if (event.type === 'done') {
        setJobState(prev =>
          prev ? { ...prev, status: 'done', downloadUrl: event.downloadUrl } : prev
        );
        es.close();
      }
    };

    es.onerror = () => {
      // SSE auto-reconnects; no action needed
    };

    return () => es.close();
  }, [jobId]);

  return jobState;
}
