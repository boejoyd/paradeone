"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  isParadeOneTheme,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type ParadeOneTheme,
} from "@/lib/theme";

function applyTheme(theme: ParadeOneTheme) {
  document.documentElement.dataset.theme = theme;
}

type ThemeSelectorProps = {
  placement?: "menu" | "settings";
};

export function ThemeSelector({ placement = "menu" }: ThemeSelectorProps) {
  const [theme, setTheme] = useState<ParadeOneTheme>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;

    const activeTheme = document.documentElement.dataset.theme;
    return isParadeOneTheme(activeTheme) ? activeTheme : DEFAULT_THEME;
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;

      const nextTheme = isParadeOneTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleChange = (nextTheme: ParadeOneTheme) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The active theme still applies when storage is unavailable.
    }
  };

  const settingsPlacement = placement === "settings";

  return (
    <label
      className={
        settingsPlacement
          ? "block rounded-xl border border-slate-600 bg-slate-950/45 p-4"
          : "block border-y border-slate-700 px-2 py-3"
      }
    >
      <span
        className={
          settingsPlacement
            ? "text-sm font-semibold text-slate-100"
            : "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300"
        }
      >
        Appearance
      </span>
      <select
        value={theme}
        onChange={(event) => {
          if (isParadeOneTheme(event.target.value)) {
            handleChange(event.target.value);
          }
        }}
        className={[
          "mt-2 w-full rounded-md border border-slate-600 bg-slate-900 text-sm font-semibold text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30",
          settingsPlacement ? "max-w-xl px-4 py-3" : "px-2.5 py-2",
        ].join(" ")}
        aria-label="ParadeOne color theme"
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="mt-1.5 block text-xs leading-5 text-slate-400">
        {THEME_OPTIONS.find((option) => option.id === theme)?.description}
      </span>
      <span className="mt-1 block text-[11px] text-slate-500">Saved on this device.</span>
    </label>
  );
}
