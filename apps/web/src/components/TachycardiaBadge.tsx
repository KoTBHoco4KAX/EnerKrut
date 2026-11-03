import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatCountdown } from "../lib/format";
import { haptic } from "../lib/telegram";

interface TachycardiaBadgeProps {
  active: boolean;
  until?: string;
}

export function TachycardiaBadge({ active, until }: TachycardiaBadgeProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) {
      return;
    }
    haptic("notification", "error");
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active || until === undefined) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-warn/50 bg-accent-warn/15 px-2.5 py-1 text-[11px] font-bold text-accent-warn">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      ТАХИКАРДИЯ ×2
      <span className="font-mono">{formatCountdown(until, now)}</span>
    </span>
  );
}
