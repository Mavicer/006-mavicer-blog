export type BackgroundId = "default" | "alpine" | "reflection";
export type Appearance = {
  background: BackgroundId;
  brightness: number;
  blur: number;
  scrollBlur: boolean;
  cardOpacity: number;
  fontSize: number;
};

export const APPEARANCE_KEY = "MAVICER_APPEARANCE_V1";
export const defaults: Appearance = {
  background: "default", brightness: 100, blur: 0, scrollBlur: true, cardOpacity: 50, fontSize: 16,
};
export const backgrounds = [
  { id: "default", name: "原野远山", day: "/images/wallhaven-wqery6-light.webp", night: "/images/wallhaven-wqery6-dark.webp" },
  { id: "alpine", name: "雪山静湖", day: "/images/backgrounds/alpine-day.webp", night: "/images/backgrounds/alpine-evening.webp" },
  { id: "reflection", name: "几何山湖", day: "/images/backgrounds/reflection-day.webp", night: "/images/backgrounds/reflection-evening.webp" },
] as const;

export function normalizeAppearance(value: unknown): Appearance {
  const v = value && typeof value === "object" ? value as Partial<Appearance> : {};
  const number = (key: keyof Appearance, min: number, max: number) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? Math.max(min, Math.min(max, v[key] as number)) : defaults[key] as number;
  return {
    background: ["default", "alpine", "reflection"].includes(v.background || "") ? v.background! : "default",
    brightness: number("brightness", 60, 120),
    blur: number("blur", 0, 12),
    scrollBlur: typeof v.scrollBlur === "boolean" ? v.scrollBlur : true,
    cardOpacity: number("cardOpacity", 40, 100),
    fontSize: number("fontSize", 13, 22),
  };
}

export function readAppearance(): Appearance {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null")); }
  catch { return { ...defaults }; }
}

export function syncAppearanceCookie(settings: Appearance, theme: string) {
  if (typeof document === "undefined" || !(location.hostname === "mavicer.cc" || location.hostname.endsWith(".mavicer.cc"))) return;
  const snapshot = { configured: true, settings, theme: theme === "light" || theme === "dark" ? theme : "auto" };
  document.cookie = `MAVICER_APPEARANCE_SHARED=${encodeURIComponent(JSON.stringify(snapshot))}; Domain=mavicer.cc; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}
