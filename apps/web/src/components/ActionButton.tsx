import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionVariant = "primary" | "positive" | "warn" | "danger";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ActionVariant, string> = {
  primary:
    "bg-accent-neon text-bg-base hover:brightness-110 active:brightness-95",
  positive:
    "bg-accent-ok text-bg-base hover:brightness-110 active:brightness-95",
  warn:
    "bg-accent-warn text-text-primary hover:brightness-110 active:brightness-95",
  danger:
    "bg-bg-elevated text-accent-warn border border-accent-warn/40 hover:bg-accent-warn/10",
};

export function ActionButton({
  variant = "primary",
  loading = false,
  icon,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled === true || loading}
      className={[
        "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT_CLASSES[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
