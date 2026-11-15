export function CircularProgress({
  completed,
  pending,
  total,
  size = 184,
}: {
  completed: number;
  pending: number;
  total: number;
  size?: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% completed: ${completed} completed, ${pending} pending out of ${total}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E9E3F5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#075B62"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <span className="font-mono-num text-xs font-semibold text-[#8274A8]">{pct}%</span>
        <span className="font-mono-num text-2xl font-bold text-[#124D52] leading-tight">
          {completed}
        </span>
        <span className="text-[11px] font-semibold text-[#075B62]">Completed</span>
        <span className="text-[11px] text-[#777777] font-mono-num mt-0.5">
          {pending} Pending
        </span>
      </div>
    </div>
  );
}
