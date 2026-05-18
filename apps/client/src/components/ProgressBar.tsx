interface Props {
  completed: number;
  failed: number;
  total: number;
}

export function ProgressBar({ completed, failed, total }: Props) {
  const donePct = total > 0 ? (completed / total) * 100 : 0;
  const failPct = total > 0 ? (failed / total) * 100 : 0;
  const overall = Math.round(donePct + failPct);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>
            <span className="text-emerald-400 font-medium">{completed}</span> done
          </span>
          {failed > 0 && (
            <span>
              <span className="text-red-400 font-medium">{failed}</span> failed
            </span>
          )}
          <span>{total} total</span>
        </div>
        <span className="text-sm font-semibold text-white/60 tabular-nums">{overall}%</span>
      </div>

      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden flex">
        <div
          className="progress-fill h-full bg-emerald-500 rounded-full"
          style={{ width: `${donePct}%` }}
        />
        <div
          className="progress-fill h-full bg-red-500/60 rounded-full"
          style={{ width: `${failPct}%` }}
        />
      </div>
    </div>
  );
}
