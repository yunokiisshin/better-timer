interface Props {
  progress: number; // 0–1
  isOvertime: boolean;
  color: string;
  size?: number;
}

export function CircularProgress({ progress, isOvertime, color, size = 128 }: Props) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(Math.max(progress, 0), 1);
  const offset = circ * (1 - filled);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      {/* Warm track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      {/* Progress arc */}
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={isOvertime ? '#c0533a' : color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        className={isOvertime ? 'overtime-arc' : undefined}
        style={{ transition: 'stroke-dashoffset 0.85s ease' }}
      />
    </svg>
  );
}
