import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "./useTheme";
import { APPEARANCE_KEY, backgrounds, defaults, normalizeAppearance, readAppearance, type Appearance } from "@/services/appearanceService";

type AppearanceContext = {
  settings: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
  wallpaper: string;
  error: string;
};
const Context = createContext<AppearanceContext>(null!);
export const useAppearance = () => useContext(Context);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(readAppearance);
  const settingsRef = useRef(settings);
  const [error, setError] = useState("");
  const { effectiveMode } = useTheme();
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) {
        settingsRef.current = readAppearance();
        setSettings(settingsRef.current);
      }
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);
  const preset = backgrounds.find(item => item.id === settings.background) || backgrounds[0];
  const wallpaper = effectiveMode === "dark" ? preset.night : preset.day;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--personal-wallpaper", `url("${wallpaper}")`);
    root.style.setProperty("--personal-brightness", String(settings.brightness / 100));
    root.style.setProperty("--personal-blur", `${settings.blur}px`);
    root.style.setProperty("--personal-card-opacity", String(settings.cardOpacity / 100));
    root.style.setProperty("--personal-reading-opacity", String(0.8 + settings.cardOpacity / 500));
    root.style.fontSize = `${settings.fontSize}px`;
  }, [settings, wallpaper]);

  const update = (patch: Partial<Appearance>) => {
    const next = normalizeAppearance({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); setError(""); }
    catch { setError("浏览器禁止保存设置，本次调整仅在当前页面生效"); }
    setSettings(next);
  };
  const reset = () => update({ ...defaults });
  return <Context.Provider value={{ settings, update, reset, wallpaper, error }}>{children}</Context.Provider>;
}
