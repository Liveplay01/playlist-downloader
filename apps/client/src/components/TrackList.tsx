import type { Track, TrackProgress, TrackStatus } from '@playlist-dl/shared';

function formatDuration(ms: number): string {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function lucidaUrl(track: Track): string {
  if (track.platform === 'spotify') {
    const id = track.id.replace('spotify:', '');
    return `https://lucida.to/?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`;
  }
  if (track.platform === 'youtube') {
    const id = track.id.replace('youtube:', '');
    return `https://lucida.to/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  }
  return `https://lucida.to/?url=${encodeURIComponent(track.searchQuery)}`;
}

const statusConfig: Record<TrackStatus, { label: string; className: string }> = {
  pending:     { label: '—',           className: 'text-white/20' },
  searching:   { label: 'Searching',   className: 'text-white/40 status-active' },
  downloading: { label: 'Downloading', className: 'text-blue-400/80 status-active' },
  done:        { label: 'Done',        className: 'text-emerald-400' },
  failed:      { label: 'Failed',      className: 'text-red-400/70' },
};

interface Props {
  tracks: Track[];
  progress?: Map<string, TrackProgress>;
}

export function TrackList({ tracks, progress }: Props) {
  const visible = tracks.slice(0, 150);

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
      {visible.map((track, i) => {
        const p = progress?.get(track.id);
        const status = p?.status ?? 'pending';
        const cfg = statusConfig[status];
        const stagger = Math.min(i * 18, 400);
        const failed = status === 'failed';

        return (
          <div
            key={track.id}
            className="row-enter flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors duration-150"
            style={{ animationDelay: `${stagger}ms` }}
          >
            <span className="text-[11px] text-white/20 w-5 shrink-0 text-right tabular-nums mt-0.5">
              {i + 1}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate leading-tight">{track.title}</p>
              <p className="text-[11px] text-white/30 truncate mt-0.5">{track.artist}</p>
              {failed && (
                <a
                  href={lucidaUrl(track)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-white/35 hover:text-white/60 underline underline-offset-2 transition-colors duration-150"
                >
                  Download on lucida.to
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              )}
            </div>

            {track.durationMs > 0 && (
              <span className="text-[11px] text-white/20 tabular-nums shrink-0 mt-0.5">
                {formatDuration(track.durationMs)}
              </span>
            )}

            <span
              className={`text-[11px] font-medium shrink-0 w-20 text-right mt-0.5 ${cfg.className}`}
              title={p?.errorMessage}
            >
              {status === 'done' && p?.quality ? p.quality : cfg.label}
            </span>
          </div>
        );
      })}

      {tracks.length > 150 && (
        <div className="px-4 py-3 text-[11px] text-center text-white/20">
          +{tracks.length - 150} more tracks
        </div>
      )}
    </div>
  );
}
