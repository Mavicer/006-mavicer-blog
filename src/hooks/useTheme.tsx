import { createContext, useContext, useEffect, useState } from "react";
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(getMode);
  const [effectiveMode, setEffectiveMode] = useState<EffectiveMode>(() =>
    getEffectiveMode(getMode())
  );

  // Re-resolve effective mode when the preference changes...
  useEffect(() => {
    setEffectiveMode(getEffectiveMode(themeMode));
  }, [themeMode]);

  // ...and when the wall-clock crosses 06:00 / 18:00 (covers background tabs).
  useEffect(() => {
    return subscribeEffective((eff) => setEffectiveMode(eff));
  }, []);

  // Apply to <html> + highlight.js + persist preference.
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const light = document.getElementById(
      "hljs-light"
    ) as HTMLLinkElement | null;
    const dark = document.getElementById(
      "hljs-dark"
    ) as HTMLLinkElement | null;
    if (light) light.disabled = effectiveMode === "dark";
    if (dark) dark.disabled = effectiveMode !== "dark";
  }, [effectiveMode]);

  const setMode = (m: ThemeMode) => {
    persistMode(m);
    setThemeMode(m);
  };
  const toggle = () => setThemeMode((m) => nextMode(m));

  return (
    <Ctx.Provider
      value={{ themeMode, effectiveMode, mode: effectiveMode, toggle, setMode }}
    >
      {children}
    </Ctx.Provider>
  );
}
