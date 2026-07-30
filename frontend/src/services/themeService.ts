// themeService.ts — three-state theme: "auto" (time-driven) | "light" | "dark".
//
// localStorage key MAVICER_THEME_MODE holds the user's *preference*.
// The *effective* mode is resolved from that preference: when "auto",
// it follows the wall-clock (06:00–18:00 light, else dark). A 60s
// poll re-resolves so a long-lived tab crosses the day/night boundary
// without a reload. This mirrors the original site's behaviour where
// the banner image flips with the time of day but the cog toggle can
// still pin a side.

export type ThemeMode = "auto" | "light" | "dark";
export type EffectiveMode = "light" | "dark";

const KEY = "MAVICER_THEME_MODE";

/** Day window: [06:00, 18:00) → light. Anything else → dark. */
export function resolveTimeMode(date: Date = new Date()): EffectiveMode {
  const h = date.getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

export function getMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "auto" ? v : "auto";
}

export function setMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
}

export function getEffectiveMode(mode: ThemeMode = getMode()): EffectiveMode {
  return mode === "auto" ? resolveTimeMode() : mode;
}

/**
 * Cycle through auto → light → dark → auto, mirroring a single
 * toggle button that still lets the user return to time-driven.
 */
export function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === "auto") return "light";
  if (mode === "light") return "dark";
  return "auto";
}

/**
 * Subscribe to effective-mode changes. Fires immediately with the
 * current effective mode, then again every minute (so a background
 * tab auto-flips at 06:00 / 18:00) and whenever the stored preference
 * changes (cross-tab via the `storage` event).
 *
 * Returns an unsubscribe function.
 */
export function subscribeEffective(
  cb: (eff: EffectiveMode) => void
): () => void {
  let last: EffectiveMode | null = null;
  const emit = () => {
    const eff = getEffectiveMode();
    if (eff !== last) {
      last = eff;
      cb(eff);
    }
  };
  emit();
  const tick = setInterval(emit, 60_000);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    clearInterval(tick);
    window.removeEventListener("storage", onStorage);
  };
}
