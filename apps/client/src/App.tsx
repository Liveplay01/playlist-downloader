import { useState, useEffect, useRef, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import type { PlaylistMeta, Quality, TrackProgress, JobState } from '@playlist-dl/shared';
import { parsePlaylist, createJob, cancelJob, getBackendUrl } from './api/client';
import { useJob } from './hooks/useJob';
import { PlatformBadges } from './components/PlatformBadge';
import { QualitySelector } from './components/QualitySelector';
import { TrackList } from './components/TrackList';
import { ProgressBar } from './components/ProgressBar';

type AppState = 'input' | 'preview' | 'progress';

function ActivityFeed({ jobState }: { jobState: JobState | null }) {
  const [log, setLog] = useState<string[]>([]);
  const prev = useRef<string>('');

  useEffect(() => {
    if (!jobState) return;

    if (jobState.status === 'done') { setLog(l => [...l, '✓ Done — building ZIP…']); return; }
    if (jobState.status === 'zipping') { setLog(l => [...l, '⟳ Creating archive…']); return; }

    const active = jobState.tracks.find(t => t.status === 'searching' || t.status === 'downloading');
    if (!active) return;

    const line = active.status === 'searching'
      ? `⌕ Searching — ${active.title}`
      : `↓ Downloading — ${active.title}`;

    if (line !== prev.current) {
      prev.current = line;
      setLog(l => [...l.slice(-4), line]);
    }
  }, [jobState]);

  if (!jobState || jobState.status === 'done') return null;

  const current = log[log.length - 1];
  const older = log.slice(0, -1);

  return (
    <div className="mt-1 space-y-0.5">
      {older.map((l, i) => (
        <p key={i} className="text-[11px] text-white/15 truncate">{l}</p>
      ))}
      {current && (
        <p className="text-[11px] text-white/40 truncate status-active">{current}</p>
      )}
    </div>
  );
}

// Music note icon — minimal, thin stroke
function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
      <path fill="currentColor" fillOpacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function BackendSettings() {
  const [url, setUrl] = useState(() => localStorage.getItem('backendUrl') || 'http://localhost:4500');
  const [saved, setSaved] = useState(true);

  const save = useCallback(() => {
    const val = url.trim() || 'http://localhost:4500';
    localStorage.setItem('backendUrl', val);
    setUrl(val);
    setSaved(true);
  }, [url]);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-white/20 text-center tracking-wide uppercase">Backend URL</p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setSaved(false); }}
          onBlur={save}
          onKeyDown={e => e.key === 'Enter' && save()}
          spellCheck={false}
          className="input-field flex-1 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] text-white/50 font-mono"
        />
        {!saved && (
          <button
            onClick={save}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-[11px] text-white/40 hover:text-white/60 transition-colors"
          >
            Save
          </button>
        )}
      </div>
      <p className="text-[10px] text-white/15 text-center">
        Run the backend locally, then enter its address here.
      </p>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>('input');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistMeta | null>(null);
  const [quality, setQuality] = useState<Quality>('lossless');
  const [jobId, setJobId] = useState<string | null>(null);
  // Tracks from the job response — guaranteed to match the job's internal IDs
  const [jobTracks, setJobTracks] = useState<PlaylistMeta['tracks'] | null>(null);

  const jobState = useJob(jobId);

  const progressMap = jobState
    ? new Map<string, TrackProgress>(jobState.tracks.map(t => [t.trackId, t]))
    : undefined;

  // Use job tracks for the progress view so IDs always match (preview tracks
  // can differ e.g. Amazon Music uses Date.now() in IDs so two parses differ)
  const displayTracks = jobTracks ?? playlist?.tracks ?? [];

  async function handlePreview() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const { playlistMeta } = await parsePlaylist(url.trim());
      setPlaylist(playlistMeta);
      setState('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load playlist', {
        style: { background: '#1a1a1a', color: '#e8e8e8', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStartDownload() {
    if (!playlist) return;
    setLoading(true);
    try {
      const { jobId: id, tracks } = await createJob(url.trim(), quality, playlist);
      setJobId(id);
      setJobTracks(tracks);
      setState('progress');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start download', {
        style: { background: '#1a1a1a', color: '#e8e8e8', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (jobId && jobState?.status !== 'done') {
      cancelJob(jobId).catch(() => {});
    }
    setState('input');
    setUrl('');
    setPlaylist(null);
    setJobId(null);
    setJobTracks(null);
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <Toaster position="top-center" />

      {/* Subtle ambient gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[560px] mx-auto px-5 pt-20 pb-24">

        {/* ── INPUT ─────────────────────────────────────────── */}
        {state === 'input' && (
          <div className="card-enter space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/[0.06] text-white/60 mb-1">
                <MusicIcon />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold text-white/90 tracking-[-0.5px] leading-tight">
                  Playlist Downloader
                </h1>
                <p className="text-[13px] text-white/35 mt-1.5">
                  Paste a link, get your music in full quality.
                </p>
              </div>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <div className="space-y-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePreview()}
                  placeholder="Spotify, YouTube Music, Apple Music, Amazon Music…"
                  className="input-field w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[13px] text-white/80 placeholder:text-white/20"
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={loading || !url.trim()}
                className="btn-press w-full py-2.5 rounded-xl bg-white text-[#080808] text-[13px] font-semibold flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                {loading ? 'Loading…' : 'Preview Tracks'}
              </button>
            </div>

            {/* Supported */}
            <PlatformBadges />

            <div className="space-y-2 text-center">
              <p className="text-[11px] text-white/20 leading-relaxed">
                Single track?{' '}
                <a
                  href="https://lucida.to"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/35 hover:text-white/55 underline underline-offset-2 transition-colors duration-150"
                >
                  lucida.to
                </a>
                {' '}offers lossless quality for individual songs.
              </p>
              <p className="text-[11px] text-white/15">
                <a
                  href="./legal.html"
                  className="hover:text-white/35 underline underline-offset-2 transition-colors duration-150"
                >
                  Terms of Service · Privacy Policy · Legal Notice
                </a>
              </p>
            </div>

            <BackendSettings />
          </div>
        )}

        {/* ── PREVIEW ───────────────────────────────────────── */}
        {state === 'preview' && playlist && (
          <div className="card-enter space-y-3">
            {/* Header */}
            <div className="space-y-1 pb-2">
              <button
                onClick={() => setState('input')}
                className="btn-press inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/50 transition-colors duration-150 mb-3"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m7-7-7 7 7 7"/>
                </svg>
                Back
              </button>
              <h2 className="text-[18px] font-semibold text-white/90 tracking-[-0.3px] leading-snug">
                {playlist.title}
              </h2>
              <p className="text-[12px] text-white/30">{playlist.trackCount} tracks</p>
            </div>

            {/* Options card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
              <QualitySelector value={quality} onChange={setQuality} />

              <button
                onClick={handleStartDownload}
                disabled={loading}
                className="btn-press w-full py-2.5 rounded-xl bg-white text-[#080808] text-[13px] font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Spinner /> : <DownloadIcon />}
                {loading ? 'Starting…' : `Download ${playlist.trackCount} tracks`}
              </button>
            </div>

            {/* Track list */}
            <TrackList tracks={playlist.tracks} />
          </div>
        )}

        {/* ── PROGRESS ──────────────────────────────────────── */}
        {state === 'progress' && (
          <div className="card-enter space-y-3">
            {/* Status header */}
            <div className="pb-2">
              <h2 className="text-[18px] font-semibold text-white/90 tracking-[-0.3px]">
                {jobState?.playlistTitle ?? playlist?.title}
              </h2>
              <ActivityFeed jobState={jobState} />
            </div>

            {/* Progress card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
              {jobState && (
                <ProgressBar
                  completed={jobState.completedTracks}
                  failed={jobState.failedTracks}
                  total={jobState.totalTracks}
                />
              )}

              {jobState?.status === 'done' && jobState.downloadUrl ? (
                <a
                  href={getBackendUrl() + jobState.downloadUrl}
                  download
                  className="btn-press relative overflow-hidden w-full py-2.5 rounded-xl bg-white text-[#080808] text-[13px] font-semibold flex items-center justify-center gap-2"
                >
                  {/* Shimmer effect */}
                  <span
                    className="shimmer-inner absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent"
                    aria-hidden
                  />
                  <DownloadIcon />
                  Download ZIP
                </a>
              ) : jobState?.status === 'zipping' ? (
                <div className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/30 flex items-center justify-center gap-2">
                  <span className="status-active">Building archive…</span>
                </div>
              ) : (
                <div className="w-full py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-[13px] text-white/15 text-center">
                  Preparing download…
                </div>
              )}

              <button
                onClick={handleReset}
                className="btn-press w-full text-[12px] text-white/25 hover:text-white/40 transition-colors duration-150"
              >
                Start a new download
              </button>
            </div>

            {/* Track list with live progress */}
            {jobState && displayTracks.length > 0 && (
              <TrackList tracks={displayTracks} progress={progressMap} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
