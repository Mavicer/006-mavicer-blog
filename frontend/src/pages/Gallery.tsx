import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useImageViewer } from "@/components/ImageViewer";
import { gallery, type GalleryEntry } from "@/data/gallery";

export default function Gallery() {
  const [playing, setPlaying] = useState<string | null>(null);
  const viewer = useImageViewer();

  // Static showcase data — same for every visitor (committed to git),
  // unlike the old localStorage store which was per-browser only.
  const items = [...gallery].sort((a, b) => b.sortOrder - a.sortOrder);

  return (
    <PageShell>
      <div className="article-content-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-first-text">展示</h1>
          <p className="text-third-text">摄影 · 视频 · 视觉创作</p>
        </div>

        {items.length === 0 ? (
          <p className="text-third-text text-center py-20">展示内容即将上线</p>
        ) : (
          <div className="gallery-grid columns-1 sm:columns-2 lg:columns-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="gallery-item mb-4 break-inside-avoid rounded-redefine overflow-hidden shadow-redefine-flat hover:shadow-redefine-flat-hover transition-all group cursor-pointer"
                onClick={() => {
                  if (item.type === "photo") {
                    viewer.show(item.url);
                  } else {
                    setPlaying(item.id);
                  }
                }}
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img
                    src={item.type === "photo" ? item.url : item.cover || ""}
                    alt={item.title}
                    loading="lazy"
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                  />
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                {(item.title || item.description) && (
                  <div className="p-3">
                    {item.title && (
                      <h3 className="text-sm font-semibold text-first-text mb-1">
                        {item.title}
                      </h3>
                    )}
                    {item.description && (
                      <p className="text-xs text-third-text leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video modal */}
      {playing && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlaying(null);
          }}
        >
          <div className="relative w-full max-w-4xl mx-4">
            <button
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
              onClick={() => setPlaying(null)}
            >
              <i className="fa-solid fa-times text-xl" />
            </button>
            {(() => {
              const item = items.find((x) => x.id === playing);
              if (!item) return null;
              // YouTube embed
              const ytMatch = item.url.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
              );
              if (ytMatch) {
                return (
                  <div className="relative pb-[56.25%] h-0 rounded-redefine overflow-hidden">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                      title={item.title}
                      allowFullScreen
                    />
                  </div>
                );
              }
              // Bilibili embed
              const biliMatch = item.url.match(/bilibili\.com\/video\/(BV[\w]+)/);
              if (biliMatch) {
                return (
                  <div className="relative pb-[56.25%] h-0 rounded-redefine overflow-hidden">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1`}
                      title={item.title}
                      allowFullScreen
                    />
                  </div>
                );
              }
              // Direct video file
              return (
                <video
                  src={item.url}
                  controls
                  autoPlay
                  className="w-full rounded-redefine"
                />
              );
            })()}
          </div>
        </div>
      )}
    </PageShell>
  );
}
