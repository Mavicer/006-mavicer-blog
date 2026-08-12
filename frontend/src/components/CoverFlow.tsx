import { useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import type { GalleryEntry } from "@/data/gallery";

/**
 * CoverFlow — iPod-style 3D album-selection carousel.
 *
 * DOM is three layers deep on purpose:
 *   outer  (overflow-hidden, clips side cards at the stage edge — 2D screen space)
 *     → middle ([perspective:1000px], the vanishing point, NO overflow here)
 *       → track (motion.div, [transform-style:preserve-3d], drag="x")
 *         → cards (motion.div, independent x/z/rotateY/scale/opacity animate)
 *
 * `transform-style: preserve-3d` on the track is mandatory — `perspective` only
 * applies to DIRECT children, and the cards are grandchildren. Drop it and the
 * whole thing collapses to flat 2D slides. That's the #1 "looks 2D not 3D" bug.
 *
 * Rotation sign convention: rotateY(+50deg) swings a card's face to the RIGHT
 * (left edge forward). So LEFT-side cards (offset<0) get +50, RIGHT-side cards
 * (offset>0) get -50 — both turn their faces inward toward the centered card.
 */

// Single card size across breakpoints — keeps the 200px-spacing math predictable
// and avoids responsive re-centering of absolutely-positioned cards.
const CARD_W = 240;
const CARD_H = 180; // 4:3 of CARD_W
const SPACING = 200; // px between adjacent card centers

type Props = {
  items: GalleryEntry[];
  onOpen: (item: GalleryEntry) => void;
};

export function CoverFlow({ items, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const count = items.length;

  // Linear clamp (iPod Cover Flow is linear, not cyclic).
  const clamp = (n: number) => Math.max(0, Math.min(n, count - 1));
  const current = clamp(index);
  const go = (next: number) => setIndex(clamp(next));

  const onDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 80; // px drag distance
    const flick = 0.3; // px/ms velocity — catches short fast flicks
    if (info.offset.x < -threshold || info.velocity.x < -flick) go(current + 1);
    else if (info.offset.x > threshold || info.velocity.x > flick)
      go(current - 1);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(current - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(current + 1);
    }
  };

  const transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 32 };

  const atStart = current <= 0;
  const atEnd = current >= count - 1;
  const active = items[current];

  return (
    <div
      className="relative overflow-hidden py-16 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="carousel"
      aria-label="展示作品轮播"
    >
      {/* Chevron controls — flanking circular buttons, disabled at the ends */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={atStart}
            aria-label="上一个"
            className={`absolute top-1/2 -translate-y-1/2 left-2 z-20 w-10 h-10 rounded-full border border-border bg-background shadow-redefine-flat hover:shadow-redefine-flat-hover hover:text-primary transition-all flex items-center justify-center ${
              atStart ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={atEnd}
            aria-label="下一个"
            className={`absolute top-1/2 -translate-y-1/2 right-2 z-20 w-10 h-10 rounded-full border border-border bg-background shadow-redefine-flat hover:shadow-redefine-flat-hover hover:text-primary transition-all flex items-center justify-center ${
              atEnd ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </>
      )}

      {/* 3D stage: perspective → preserve-3d track → absolutely-centered cards */}
      <div className="[perspective:1000px]">
        <motion.div
          className="[transform-style:preserve-3d] relative h-[180px] cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
          drag={count > 1 ? "x" : false}
          dragSnapToOrigin
          dragElastic={0.2}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
        >
          {items.map((item, i) => {
            const offset = i - current;
            const ao = Math.abs(offset);
            const x = offset * SPACING;
            const z = offset === 0 ? 120 : -120; // center forward, sides back
            const rotateY = offset === 0 ? 0 : offset > 0 ? -50 : 50;
            const scale = offset === 0 ? 1.08 : 0.82;
            const opacity = ao >= 3 ? 0 : ao === 2 ? 0.4 : 1;
            const zIndex = count - ao;
            const isVideo = item.type === "video";
            const cover = isVideo ? item.cover || "" : item.url;
            return (
              <motion.div
                key={item.id}
                className="absolute left-1/2 top-1/2 rounded-redefine overflow-hidden shadow-redefine-flat bg-third-background cursor-pointer"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: -CARD_W / 2,
                  marginTop: -CARD_H / 2,
                  zIndex,
                  pointerEvents: ao > 2 ? "none" : "auto",
                }}
                animate={{ x, z, rotateY, scale, opacity }}
                transition={transition}
                onClick={() =>
                  i === current ? onOpen(item) : setIndex(i)
                }
              >
                <img
                  src={cover}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0";
                  }}
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Centered-item caption — iPod shows the selected album's title below the flow */}
      {active && (active.title || active.description) && (
        <div className="mt-6 text-center min-h-[3.5rem] px-4">
          {active.title && (
            <h3 className="text-base font-semibold text-first-text mb-1">
              {active.title}
            </h3>
          )}
          {active.description && (
            <p className="text-xs text-third-text leading-relaxed">
              {active.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CoverFlow;
