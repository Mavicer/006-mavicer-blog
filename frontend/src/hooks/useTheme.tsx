import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import {
  getMode,
  setMode as persistMode,
  nextMode,
  getEffectiveMode,
  subscribeEffective,
  type ThemeMode,
  type EffectiveMode,
} from "@/services/themeService";

type ThemeCtx = {
  /** user preference: auto | light | dark */
  themeMode: ThemeMode;
  /** resolved mode actually applied to the DOM / background image */
  effectiveMode: EffectiveMode;
  /** convenience alias kept for components that only read light/dark */
  mode: EffectiveMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx>(null as any);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Deterministic first render for SSG hydration. The head script applies the
  // user's colors before paint; restore the preference before React paints.
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [effectiveMode, setEffectiveMode] = useState<EffectiveMode>("light");
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let mode: ThemeMode = "auto";
    try { mode = getMode(); } catch { /* Storage can be blocked. */ }
    setThemeMode(mode); setEffectiveMode(getEffectiveMode(mode)); setReady(true);
  }, []);

  // Re-resolve effective mode when the preference changes...
  useEffect(() => {
    if (!ready) return;
    setEffectiveMode(getEffectiveMode(themeMode));
  }, [themeMode, ready]);

  // ...and when the wall-clock crosses 06:00 / 18:00 (covers background tabs).
  useEffect(() => {
    return subscribeEffective((eff) => setEffectiveMode(eff));
  }, []);

  // Apply before paint to avoid showing the opposite theme first.
  useLayoutEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (effectiveMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const light = document.getElementById("hljs-light") as HTMLLinkElement | null;
    const dark = document.getElementById("hljs-dark") as HTMLLinkElement | null;
    if (light) light.disabled = effectiveMode === "dark";
    if (dark) dark.disabled = effectiveMode !== "dark";
  }, [effectiveMode, ready]);

  const setMode = (m: ThemeMode) => {
    persistMode(m);
    setThemeMode(m);
  };
  const toggle = () => setMode(nextMode(themeMode));

  return (
    <Ctx.Provider
      value={{ themeMode, effectiveMode, mode: effectiveMode, toggle, setMode }}
    >
      {children}
    </Ctx.Provider>
  );
}
