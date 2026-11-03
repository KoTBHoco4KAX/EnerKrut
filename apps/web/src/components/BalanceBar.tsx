import { KeyRound, Wallet } from "lucide-react";
import { formatRub } from "../lib/format";

interface BalanceBarProps {
  balanceRub: number;
  keys: number;
  className?: string;
}

export function BalanceBar({ balanceRub, keys, className = "" }: BalanceBarProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 text-xs font-medium text-text-muted ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5 text-accent-neon" aria-hidden="true" />
        <span className="font-mono text-text-primary">{formatRub(balanceRub)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5 text-accent-ok" aria-hidden="true" />
        <span className="font-mono text-text-primary">{keys}</span>
      </span>
    </div>
  );
}
