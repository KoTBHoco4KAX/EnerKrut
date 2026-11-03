interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-gradient-to-r from-bg-card via-bg-elevated to-bg-card bg-[length:1000px_100%] ${className}`}
      aria-hidden="true"
    />
  );
}
