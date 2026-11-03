import type { Rarity } from "@enerkrut/shared";
import { rarityLabel } from "../lib/format";
import { RARITY_PRESENTATION } from "../lib/rarity";

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
}

export function RarityBadge({ rarity, className = "" }: RarityBadgeProps) {
  const presentation = RARITY_PRESENTATION[rarity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${presentation.text} ${presentation.chip} ${presentation.glow} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${presentation.dot}`} />
      {rarityLabel(rarity)}
    </span>
  );
}
