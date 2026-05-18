const platforms = [
  { name: 'Spotify', dot: '#1DB954' },
  { name: 'YouTube Music', dot: '#FF0000' },
  { name: 'Apple Music', dot: '#FA243C' },
  { name: 'Amazon Music', dot: '#00A8E1' },
];

export function PlatformBadges() {
  return (
    <div className="flex items-center justify-center gap-4">
      {platforms.map(p => (
        <span key={p.name} className="flex items-center gap-1.5 text-xs text-white/35">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: p.dot }}
          />
          {p.name}
        </span>
      ))}
    </div>
  );
}
