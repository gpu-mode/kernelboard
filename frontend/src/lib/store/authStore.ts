import { create } from "zustand";
import type { User } from "../types/user";
import { getMe, logout } from "../../api/api";

type AuthState = {
  me: User | null;
  loading: boolean;
  error: string | null;
  inFlight: boolean;
  setMe: (me: User | null) => void;
  fetchMe: () => Promise<void>;
  logoutAndRefresh: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  me: null,
  loading: false,
  error: null,
  inFlight: false,

  setMe: (me) => set((s) => (s.me === me ? s : { me })),

  fetchMe: async () => {
    if (get().inFlight) return;
    set((s) =>
      s.loading ? s : { loading: true, error: null, inFlight: true },
    );
    try {
      const res = await getMe();
      set((s) => ({
        me: res,
        loading: false,
        inFlight: false,
        error: null,
      }));
    } catch (e: any) {
      set((s) => ({
        error: e?.message ?? "Failed to fetch /me",
        loading: false,
        inFlight: false,
        me: null,
      }));
    }
  },

  logoutAndRefresh: async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      await get().fetchMe();
    }
  },
}));
