// galleryService.ts — localStorage-backed gallery store for photos & videos.
//
// ⚠️  SECURITY: Write operations include a frontend requireOwner() guard.
//     This is UX-level protection only. Production auth must be server-side.

import { currentUser } from "@/auth/auth";

/** Frontend-only auth guard. Throws if the current user is not an owner. */
function requireOwner(): void {
  const u = currentUser();
  if (!u || !u.is_owner) {
    const err = new Error("需要管理员权限") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

/** Max file sizes for direct-upload (dataURL stored in localStorage). */
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;  // 5 MB
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB

export type GalleryType = "photo" | "video";

export type GalleryItem = {
  id: string;
  type: GalleryType;
  title: string;
  url: string; // photo: image URL or data URL; video: embed URL or data URL
  cover?: string; // video cover image (auto-extracted from video or provided)
  description?: string;
  createdAt: string;
  sortOrder: number;
  /** "upload" if the url is a blob/data-URL from a user file pick. */
  source?: "upload" | "url";
};

export type GalleryInput = {
  type: GalleryType;
  title: string;
  url: string;
  cover?: string;
  description?: string;
  sortOrder?: number;
  source?: "upload" | "url";
};

const KEY = "MAVICER_GALLERY";

function read(): GalleryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: GalleryItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("mavicer-gallery-changed"));
}

function genId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listGallery(): GalleryItem[] {
  return read().sort((a, b) => b.sortOrder - a.sortOrder);
}

export function createGalleryItem(input: GalleryInput): GalleryItem {
  requireOwner();
  const item: GalleryItem = {
    id: genId(),
    type: input.type,
    title: input.title,
    url: input.url,
    cover: input.cover,
    description: input.description,
    createdAt: new Date().toISOString(),
    sortOrder: input.sortOrder ?? 10,
    source: input.source || "url",
  };
  write([...read(), item]);
  return item;
}

export function updateGalleryItem(id: string, input: GalleryInput): GalleryItem {
  requireOwner();
  const items = read();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error("展示项不存在");
  const updated: GalleryItem = {
    ...items[idx],
    type: input.type,
    title: input.title,
    url: input.url,
    cover: input.cover,
    description: input.description,
    sortOrder: input.sortOrder ?? items[idx].sortOrder,
    source: input.source || items[idx].source || "url",
  };
  items[idx] = updated;
  write(items);
  return updated;
}

export function deleteGalleryItem(id: string): void {
  requireOwner();
  write(read().filter((x) => x.id !== id));
}

/**
 * Read a File (from <input type="file"> or drag-drop) as a data URL.
 * On mobile, the same <input type="file" accept="image/*"> opens the
 * photo library / camera. On desktop, it opens the Finder/Explorer.
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract a cover frame from a video file by seeking to 1s and drawing
 * to a canvas. Returns a JPEG data URL.
 */
export function extractVideoCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      // seek to 1s or 10% of duration
      video.currentTime = Math.min(1, video.duration * 0.1 || 1);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas not supported"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video load failed"));
    };
  });
}
