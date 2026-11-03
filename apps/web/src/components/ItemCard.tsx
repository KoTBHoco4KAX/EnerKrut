import type { ReactNode } from "react";
import { Clock, DollarSign, Package, Wine } from "lucide-react";
import type { Condition, Decision, Rarity } from "@enerkrut/shared";
import { RARITY_PRESENTATION } from "../lib/rarity";

export interface ItemCardItem {
  displayName: string;
  imageThumbUrl: string;
  rarity: Rarity;
  condition?: Condition;
}

interface ItemCardProps {
  item: ItemCardItem;
  meta?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode;
  decision?: Decision | null;
  compact?: boolean;
  rarityBar?: boolean;
  expanded?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

const DECISION_ICON = {
  sold: DollarSign,
  drank: Wine,
  kept: Clock,
  pending: Clock,
} as const;

const DECISION_CLASS = {
  sold: "text-accent-ok",
  drank: "text-accent-neon",
  kept: "text-text-muted",
  pending: "text-text-muted",
} as const;

export function ItemCard({
  item,
  meta,
  badges,
  trailing,
  decision = null,
  compact = false,
  rarityBar = false,
  expanded = false,
  onClick,
  children,
}: ItemCardProps) {
  const presentation = RARITY_PRESENTATION[item.rarity];
  const decisionKey = decision ?? "pending";
  const DecisionIcon = DECISION_ICON[decisionKey];
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border-base bg-bg-card ${
        rarityBar ? `border-l-4 ${presentation.border}` : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 text-left ${
          compact ? "px-3 py-2.5" : "p-3"
        } ${onClick === undefined ? "cursor-default" : ""}`}
      >
        <span
          className={`relative ${
            compact ? "h-10 w-10" : "h-16 w-16"
          } shrink-0 overflow-hidden rounded-lg bg-bg-elevated`}
        >
          <Package
            className={`absolute inset-0 m-auto ${
              compact ? "h-5 w-5" : "h-7 w-7"
            } text-text-muted`}
            aria-hidden="true"
          />
          <img
            src={item.imageThumbUrl}
            alt={item.displayName}
            loading="lazy"
            className="relative z-10 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.opacity = "0";
            }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">
            {item.displayName}
          </span>
          {meta !== undefined ? (
            <span className="mt-0.5 block truncate text-[11px] text-text-muted">
              {meta}
            </span>
          ) : null}
          {badges !== undefined ? (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          <DecisionIcon
            className={`h-4 w-4 ${DECISION_CLASS[decisionKey]}`}
            aria-label={
              decisionKey === "sold"
                ? "Продано"
                : decisionKey === "drank"
                  ? "Выпито"
                  : decisionKey === "kept"
                    ? "Оставлено"
                    : "Ожидает"
            }
          />
        </span>
      </button>
      {expanded && children !== undefined ? (
        <div className="border-t border-border-base p-3">{children}</div>
      ) : null}
    </div>
  );
}
