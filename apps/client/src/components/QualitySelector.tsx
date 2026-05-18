import type { Quality } from '@playlist-dl/shared';

const options: { value: Quality; label: string; sub: string }[] = [
  { value: 'lossless', label: 'Lossless', sub: 'FLAC / ALAC' },
  { value: '320',      label: '320 kbps', sub: 'MP3' },
  { value: '256',      label: '256 kbps', sub: 'AAC' },
  { value: '128',      label: '128 kbps', sub: 'MP3' },
];

interface Props {
  value: Quality;
  onChange: (q: Quality) => void;
}

export function QualitySelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Quality</p>
      <div className="grid grid-cols-4 gap-2">
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`quality-option btn-press relative p-3 rounded-xl border text-left ${
                active
                  ? 'border-white/20 bg-white/[0.07]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              {active && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/70" />
              )}
              <div className="text-xs font-semibold text-white/85">{opt.label}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{opt.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
