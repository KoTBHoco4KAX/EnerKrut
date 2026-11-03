interface BpmIndicatorProps {
  bpm: number;
  className?: string;
}

export function BpmIndicator({ bpm, className = "" }: BpmIndicatorProps) {
  const danger = bpm >= 120;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border-base bg-bg-card px-2.5 py-1 text-[11px] font-semibold ${
        danger ? "text-accent-warn" : "text-accent-neon"
      } ${className}`}
      aria-label={`Пульс ${bpm}`}
    >
      <span
        className={`h-2 w-2 animate-pulse rounded-full ${
          danger ? "bg-accent-warn" : "bg-accent-neon"
        }`}
      />
      <span className="font-mono">{bpm}</span>
    </span>
  );
}
