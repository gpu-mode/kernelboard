import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

type ThemeState = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemPreference() : mode;
}

function loadSavedMode(): ThemeMode {
  try {
    const saved = localStorage.getItem("theme-mode");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // localStorage unavailable
  }
  return "system";
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = loadSavedMode();
  return {
    mode: initial,
    resolvedMode: resolveMode(initial),
    setMode: (mode) => {
      localStorage.setItem("theme-mode", mode);
      set({ mode, resolvedMode: resolveMode(mode) });
    },
  };
});
