import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useToastStore } from "../stores/toast";
import type { ToastTone } from "../stores/toast";

const TONE_CLASSES: Record<ToastTone, string> = {
  info: "border-border-base text-text-primary",
  success: "border-accent-ok/40 text-accent-ok",
  warning: "border-accent-warn/40 text-accent-warn",
  error: "border-accent-warn/50 text-accent-warn",
};

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <motion.button
              type="button"
              key={toast.id}
              onClick={() => dismiss(toast.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border bg-bg-elevated px-4 py-2.5 text-xs font-medium ${TONE_CLASSES[toast.tone]}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{toast.message}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
