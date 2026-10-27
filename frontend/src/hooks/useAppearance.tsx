import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "./useTheme";
import { APPEARANCE_KEY, backgrounds, defaults, readAppearance, readCustomImages, saveCustomImages, prepareImage, type Appearance, type CustomImages } from "@/services/appearanceService";

type AppearanceContext = {
  settings: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => Promise<void>;
  upload: (mode: "light" | "dark", file: File) => Promise<void>;
  remove: (mode: "light" | "dark") => Promise<void>;
  custom: { light?: string; dark?: string };
  wallpaper: string;
  loading: boolean;
  error: string;
  clearError: () => void;
};
const Context = createContext<AppearanceContext>(null!);
export const useAppearance = () => useContext(Context);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(readAppearance);
  const settingsRef = useRef(settings);
  const [images, setImages] = useState<CustomImages>({});
  const [custom, setCustom] = useState<{ light?: string; dark?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { effectiveMode } = useTheme();
  useEffect(() => {
    let active = true;
    readCustomImages().then(value => { if (active) setImages(value); })
      .catch(() => { if (active) setError("无法读取本地图片，仍可使用预设背景"); })
      .finally(() => { if (active) setLoading(false); });
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) {
        settingsRef.current = readAppearance();
        setSettings(settingsRef.current);
        readCustomImages().then(value => { if (active) setImages(value); }).catch(() => {});
      }
    };
    addEventListener("storage", onStorage);
    return () => { active = false; removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => {
    const urls = {
      light: images.light ? URL.createObjectURL(images.light) : undefined,
      dark: images.dark ? URL.createObjectURL(images.dark) : undefined,
    };
    setCustom(urls);
    return () => { Object.values(urls).forEach(url => url && URL.revokeObjectURL(url)); };
  }, [images]);
  const preset = backgrounds.find(item => item.id === settings.background) || backgrounds[0];
  const wallpaper = settings.background === "custom" && (custom.light || custom.dark)
    ? (custom[effectiveMode] || custom.light || custom.dark)!
    : effectiveMode === "dark" ? preset.night : preset.day;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--personal-wallpaper", `url("${wallpaper}")`);
    root.style.setProperty("--personal-brightness", String(settings.brightness / 100));
    root.style.setProperty("--personal-blur", `${settings.blur}px`);
    root.style.setProperty("--personal-card-opacity", String(settings.cardOpacity / 100));
    // Reading surfaces keep a higher minimum opacity for long text.
    root.style.setProperty("--personal-reading-opacity", String(0.8 + settings.cardOpacity / 500));
    root.style.fontSize = `${settings.fontSize}px`;
  }, [settings, wallpaper]);

  const update = (patch: Partial<Appearance>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); setError(""); }
    catch { setError("浏览器禁止保存设置，本次调整仅在当前页面生效"); }
    setSettings(next);
  };
  const saveImages = async (next: CustomImages) => {
    await saveCustomImages(next);
    setImages(next);
    return next;
  };
  const upload = async (mode: "light" | "dark", file: File) => {
    const blob = await prepareImage(file);
    await saveImages({ ...images, [mode]: blob });
    update({ background: "custom" });
  };
  const remove = async (mode: "light" | "dark") => {
    const next = { ...images }; delete next[mode];
    await saveImages(next);
    if (!next.light && !next.dark && settings.background === "custom") update({ background: "default" });
  };
  const reset = async () => {
    await saveImages({});
    update({ ...defaults });
  };
  return <Context.Provider value={{ settings, update, reset, upload, remove, custom, wallpaper, loading, error, clearError: () => setError("") }}>{children}</Context.Provider>;
}
