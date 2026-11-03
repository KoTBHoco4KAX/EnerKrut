import type { Condition } from "@enerkrut/shared";
import { conditionLabel } from "../lib/format";

interface ConditionBadgeProps {
  condition: Condition;
  className?: string;
}

export function ConditionBadge({ condition, className = "" }: ConditionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border-base bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-muted ${className}`}
    >
      {conditionLabel(condition)}
    </span>
  );
}
