import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: ToastItem) => void;
  dismiss: (id: number) => void;
}

let toastSequence = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({ toasts: [...state.toasts, toast].slice(-3) })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function showToast(message: string, tone: ToastTone = "info"): void {
  toastSequence += 1;
  const id = toastSequence;
  useToastStore.getState().push({ id, message, tone });
  window.setTimeout(() => {
    useToastStore.getState().dismiss(id);
  }, 2000);
}
