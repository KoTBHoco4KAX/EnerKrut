import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon !== undefined ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-card text-text-muted">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {description !== undefined ? (
        <p className="max-w-xs text-sm leading-relaxed text-text-muted">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
