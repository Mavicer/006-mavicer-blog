export type BackgroundId = "default" | "alpine" | "reflection" | "custom";
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
    background: ["default", "alpine", "reflection", "custom"].includes(v.background || "") ? v.background! : "default",
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

export type CustomImages = { light?: Blob; dark?: Blob };
// Images stay in this browser. IndexedDB avoids localStorage's small string quota.
async function imageStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mavicer-appearance", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onerror = () => reject(new Error("无法访问浏览器图片存储"));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      const transaction = db.transaction("images", mode);
      const operation = action(transaction.objectStore("images"));
      transaction.oncomplete = () => { db.close(); resolve(operation.result); };
      transaction.onabort = () => { db.close(); reject(new Error("图片保存失败，浏览器存储空间可能不足")); };
      transaction.onerror = () => { /* onabort reports the failure. */ };
    };
  });
}
export const readCustomImages = async (): Promise<CustomImages> =>
  (await imageStore("readonly", store => store.get("pair"))) || {};
export const saveCustomImages = (images: CustomImages) => imageStore("readwrite", store => store.put(images, "pair"));

export async function prepareImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type))
    throw new Error("请选择 JPG、PNG、WebP 或 AVIF 图片");
  if (file.size > 20 * 1024 * 1024) throw new Error("请选择小于 20 MB 的图片");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > 60_000_000) throw new Error("图片尺寸过大，请选择 6000 万像素以内的图片");
    const scale = Math.min(1, 3840 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("图片处理失败，请换一张试试")), "image/webp", 0.9,
    ));
  } catch (error) {
    throw error instanceof Error && error.message.includes("图片") ? error : new Error("无法读取这张图片，请换一张试试");
  } finally { URL.revokeObjectURL(url); }
}
