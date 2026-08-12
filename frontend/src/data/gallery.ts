// gallery.ts — static showcase data for the public 展示 page.
//
// This is the single source of truth for what every visitor sees at /gallery.
// Unlike the localStorage-backed GalleryAdmin (which is per-browser only),
// entries here are committed to git and shipped with the build — same for
// every visitor. Edit this file (and drop real image files into
// /public/images/gallery/) to publish new work, just like adding a post.
//
// `GalleryEntry` is a slimmed-down shape of `galleryService.GalleryItem`:
// the runtime-only `createdAt` / `source` fields are dropped because
// Gallery.tsx never reads them. Note: do NOT use `as const` here — on an
// array of objects with a union field it produces a readonly tuple with
// literal-narrowed types that won't assign to the mutable `GalleryEntry[]`.
// An explicit annotation is the correct, simplest form (profile.ts uses
// `as const` safely only because it is a single object, not an array).

export type GalleryEntry = {
  /** Stable slug used as the React key. */
  id: string;
  type: "photo" | "video";
  title: string;
  /** photo: image path under /images/...; video: YouTube/Bilibili/embed URL. */
  url: string;
  /** Optional poster image for video entries. */
  cover?: string;
  description?: string;
  /** Descending sort — higher comes first. */
  sortOrder: number;
};

// TODO: 替换占位照片为真实摄影作品。把图片放到 /public/images/gallery/，
//       然后把下方 url 指向 "/images/gallery/xxx.jpg"。
export const gallery: GalleryEntry[] = [
  {
    id: "placeholder-aurora",
    type: "photo",
    title: "占位作品 · 一",
    description: "摄影占位 — 替换为真实作品后此处显示说明文字。",
    url: "/images/wallhaven-wqery6-light.webp",
    sortOrder: 30,
  },
  {
    id: "placeholder-redefine",
    type: "photo",
    title: "占位作品 · 二",
    description: "摄影占位 — 同上。",
    url: "/images/redefine-og.webp",
    sortOrder: 20,
  },
  {
    id: "video-piano-placeholder",
    type: "video",
    title: "视频占位 · 钢琴 / 音乐",
    description: "视频占位 — 替换为真实的 YouTube / Bilibili 链接。",
    // YouTube 嵌入示例（真实可播）。换成自己的演奏 / Animenz cover 即可。
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    cover: "/images/wallhaven-wqery6-light.webp",
    sortOrder: 10,
  },
];
