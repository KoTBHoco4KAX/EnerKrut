import { motion } from "framer-motion";
import { Coffee, Package, RussianRuble } from "lucide-react";
import type { PublicCase } from "@enerkrut/shared";
import { formatRub } from "../lib/format";
import { haptic } from "../lib/telegram";

interface CaseCardProps {
  publicCase: PublicCase;
  disabled?: boolean;
  onOpen: (caseId: string) => void;
}

export function CaseCard({ publicCase, disabled = false, onOpen }: CaseCardProps) {
  const handleClick = (): void => {
    if (disabled) {
      return;
    }
    haptic("impact", "light");
    onOpen(publicCase.id);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={`Открыть ${publicCase.displayName}`}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`group relative flex w-full flex-col gap-2 rounded-xl border border-border-base bg-bg-card p-3 text-left transition ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-accent-neon/40"
      }`}
    >
      {publicCase.hasVendingMachine ? (
        <span
          className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-bg-base/80 text-accent-neon"
          aria-label="Автомат"
        >
          <Coffee className="h-4 w-4" />
        </span>
      ) : null}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-elevated">
        <Package
          className="absolute inset-0 m-auto h-10 w-10 text-text-muted"
          aria-hidden="true"
        />
        <img
          src={publicCase.coverUrl}
          alt={publicCase.displayName}
          loading="lazy"
          className="relative z-10 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-bg-base/70 via-transparent to-transparent" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-text-primary">
          {publicCase.displayName}
        </span>
        {publicCase.minBpmRequired > 0 ? (
          <span className="shrink-0 rounded-full bg-accent-warn/20 px-2 py-1 text-[10px] font-bold text-accent-warn">
            BPM ≥ {publicCase.minBpmRequired}
          </span>
        ) : null}
      </div>
      <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-accent-neon">
        <RussianRuble className="h-3.5 w-3.5" aria-hidden="true" />
        {formatRub(publicCase.priceRub).replace(" ₽", "")}
      </span>
    </motion.button>
  );
}
