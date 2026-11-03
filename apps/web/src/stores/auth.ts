import { create } from "zustand";
import type { MeResponse } from "@enerkrut/shared";

interface AuthState {
  initData: string;
  user: MeResponse | null;
  bpm: number;
  tachycardia: MeResponse["tachycardia"];
  authExpired: boolean;
  setInitData: (initData: string) => void;
  setMe: (me: MeResponse) => void;
  setBpm: (bpm: number) => void;
  setAuthExpired: (expired: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initData: "",
  user: null,
  bpm: 60,
  tachycardia: { active: false },
  authExpired: false,
  setInitData: (initData) => set({ initData, authExpired: false }),
  setMe: (me) =>
    set({
      user: me,
      bpm: me.bpmCurrent,
      tachycardia: me.tachycardia,
    }),
  setBpm: (bpm) => set({ bpm }),
  setAuthExpired: (authExpired) => set({ authExpired }),
  clear: () =>
    set({
      initData: "",
      user: null,
      bpm: 60,
      tachycardia: { active: false },
      authExpired: false,
    }),
}));

export function keysSummary(keys: MeResponse["keys"]): number {
  return keys.gray + keys.color + keys.engraved + keys.gold;
}
