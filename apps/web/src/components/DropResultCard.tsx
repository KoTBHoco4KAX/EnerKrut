import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { PackageOpen } from "lucide-react";
import type { OpenCaseResponse } from "@enerkrut/shared";
import { formatRub } from "../lib/format";
import { RARITY_PRESENTATION } from "../lib/rarity";
import { ConditionBadge } from "./ConditionBadge";
import { RarityBadge } from "./RarityBadge";

export type DropItemView = NonNullable<OpenCaseResponse["item"]>;

interface DropResultCardProps {
  item: DropItemView;
  servedPriceRub: number;
  actions?: ReactNode;
  compact?: boolean;
}

export function DropResultCard({
  item,
  servedPriceRub,
  actions,
  compact = false,
}: DropResultCardProps) {
  const presentation = RARITY_PRESENTATION[item.rarity];
  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex w-full flex-col items-center gap-3 rounded-2xl border border-border-base bg-bg-card p-5 ${presentation.glow} ${
        compact ? "min-w-[260px]" : ""
      }`}
      data-testid="drop-result-card"
    >
      <div className="relative flex w-full justify-center">
        <PackageOpen
          className={`${compact ? "h-20 w-20" : "h-28 w-28"} text-text-muted`}
          aria-hidden="true"
        />
        <img
          src={item.imageUrl}
          alt={item.displayName}
          className={`${compact ? "w-28" : "w-3/5"} absolute inset-0 m-auto max-h-full rounded-xl object-contain`}
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <RarityBadge rarity={item.rarity} />
        <ConditionBadge condition={item.condition} />
      </div>
      <h2 className="text-center text-lg font-semibold leading-tight text-text-primary">
        {item.displayName}
      </h2>
      <p className="text-center font-mono text-xl font-bold text-accent-ok">
        {formatRub(servedPriceRub)}
      </p>
      <p className="line-clamp-3 text-center text-xs leading-relaxed text-text-muted">
        {item.flavorNotes}
      </p>
      {actions !== undefined ? (
        <div className="mt-2 grid w-full grid-cols-2 gap-3">{actions}</div>
      ) : null}
    </motion.article>
  );
}
