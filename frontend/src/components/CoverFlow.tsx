import { useRef, useState, type KeyboardEvent } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
  type PanInfo,
} from "framer-motion";
import type { GalleryEntry } from "@/data/gallery";

/**
 * CoverFlow — iPod-style 3D album carousel.
 *
 * Cards live on the surface of a vertical CYLINDER (radius R). Each card sits at
 * angle θ = offset · STEP on the cylinder's front arc, where `offset = i − pos`
 * and `pos` is a CONTINUOUS position value (not just the snapped index). The
 * card's screen x, depth z, and rotation are all coupled functions of θ:
 *
 *   x       = R · sin(θ)        // arcs outward along the cylinder
 *   z       = R · (cos(θ) − 1)  // front of cylinder at z=0, sides recede along the arc
 *   rotateY = θ                 // faces radially outward from the cylinder axis
 *
 * Because all three are functions of the same θ, when `pos` changes they move
 * TOGETHER along the arc — the cylinder rolls, cards don't independently retreat.
 * Apparent size shrink on side cards comes from `perspective` acting on their z
 * (geometric, continuous), not from discrete scale jumps.
 *
 * `pos` is a MotionValue driven live by the pan gesture (cylinder rolls with the
 * finger); on release it springs to the nearest integer and commits to `index`.
 *
 * DOM is three layers:
 *   outer  (overflow-hidden — clips side cards at the stage edge, 2D screen space)
 *     → middle ([perspective:900px] — the vanishing point, NO overflow here)
 *       → track (motion.div, [transform-style:preserve-3d], onPan — does NOT move)
 *         → CoverCard (motion.div, x/z/rotateY/opacity via useTransform on `pos`)
 *
 * `transform-style: preserve-3d` on the track is mandatory — `perspective` only
 * applies to DIRECT children, and the cards are grandchildren. Drop it and the
 * whole thing collapses to flat 2D slides.
 *
 * Transform order: framer-motion emits `translate3d(x,0,z) rotateY(θ)`, so
 * rotateY applies first (around the card's own center = tilt in place), then
 * translate moves the tilted card to its cylinder position. Correct cylinder look.
 */

const CARD_W = 240;
const CARD_H = 180; // 4:3 of CARD_W
// Cylinder geometry. R = radius; STEP = degrees per card on the front arc.
// Tuned so offset 0/±1/±2 sit on a readable front arc and ±3 fades past the edge.
const R = 280;
const STEP = 32; // degrees per card
const STEP_RAD = (STEP * Math.PI) / 180;
// Drag px → card-step conversion: visual x-distance between adjacent cards.
const DRAG_UNIT = R * Math.sin(STEP_RAD);

type Props = {
  items: GalleryEntry[];
  onOpen: (item: GalleryEntry) => void;
};

export function CoverFlow({ items, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const count = items.length;

  const clamp = (n: number) => Math.max(0, Math.min(n, count - 1));
  const current = clamp(index);

  // Continuous cylinder position (card units). Integer = a card centered.
  const pos = useMotionValue(current);
  // Position captured at pan start — deltas are measured from here.
  const baseRef = useRef(current);

  const springTo = (target: number) => {
    animate(
      pos,
      target,
      reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 260, damping: 30 }
    );
  };

  const goTo = (next: number) => {
    const n = clamp(next);
    setIndex(n);
    springTo(n);
  };

  const onPanStart = () => {
    baseRef.current = pos.get();
  };
  const onPan = (_e: unknown, info: PanInfo) => {
    // Drag left → offset.x < 0 → pos increases → next card rolls into center.
    pos.set(baseRef.current - info.offset.x / DRAG_UNIT);
  };
  const onPanEnd = (_e: unknown, info: PanInfo) => {
    const moved = -info.offset.x / DRAG_UNIT;
    let target = Math.round(baseRef.current + moved);
    // Flick: a fast short drag still advances at least one card.
    if (target === baseRef.current && Math.abs(info.velocity.x) > 0.3) {
      target = baseRef.current + (info.velocity.x < 0 ? 1 : -1);
    }
    const final = clamp(target);
    setIndex(final);
    springTo(final);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    }
  };

  const atStart = current <= 0;
  const atEnd = current >= count - 1;
  const active = items[current];

  return (
    <div
      className="relative overflow-hidden py-14 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
            onClick={() => goTo(current - 1)}
            disabled={atStart}
            aria-label="上一个"
            className={`absolute top-1/2 -translate-y-1/2 left-2 z-20 w-10 h-10 rounded-full border border-border bg-background/80 backdrop-blur-sm shadow-redefine-flat hover:shadow-redefine-flat-hover hover:text-primary transition-all flex items-center justify-center ${
              atStart ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={atEnd}
            aria-label="下一个"
            className={`absolute top-1/2 -translate-y-1/2 right-2 z-20 w-10 h-10 rounded-full border border-border bg-background/80 backdrop-blur-sm shadow-redefine-flat hover:shadow-redefine-flat-hover hover:text-primary transition-all flex items-center justify-center ${
              atEnd ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </>
      )}

      {/* 3D stage: perspective → preserve-3d track (does NOT move) → cards */}
      <div className="[perspective:900px]">
        <motion.div
          className="[transform-style:preserve-3d] relative h-[200px] cursor-grab active:cursor-grabbing touch-pan-y"
          onPanStart={onPanStart}
          onPan={onPan}
          onPanEnd={onPanEnd}
        >
          {items.map((item, i) => (
            <CoverCard
              key={item.id}
              item={item}
              i={i}
              pos={pos}
              current={current}
              count={count}
              onOpen={onOpen}
              onSelect={goTo}
            />
          ))}
        </motion.div>
      </div>

      {/* Centered-item caption — iPod shows the selected album's title below */}
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

/** Single card on the cylinder. Its own component so useTransform hooks are
 *  called unconditionally per card (rules of hooks in a loop). */
function CoverCard({
  item,
  i,
  pos,
  current,
  count,
  onOpen,
  onSelect,
}: {
  item: GalleryEntry;
  i: number;
  pos: ReturnType<typeof useMotionValue<number>>;
  current: number;
  count: number;
  onOpen: (item: GalleryEntry) => void;
  onSelect: (next: number) => void;
}) {
  // θ = (i − pos) · STEP — the card's angle on the cylinder arc.
  const x = useTransform(pos, (p) => R * Math.sin((i - p) * STEP_RAD));
  const z = useTransform(pos, (p) => R * (Math.cos((i - p) * STEP_RAD) - 1));
  const rotateY = useTransform(pos, (p) => (i - p) * STEP);
  // Subtle center pop; perspective does the rest of the size work.
  const scale = useTransform(pos, (p) => {
    const ao = Math.abs(i - p);
    return ao < 0.5 ? 1 + (0.5 - ao) * 0.12 : 1;
  });
  const opacity = useTransform(pos, (p) => {
    const ao = Math.abs(i - p);
    return ao <= 1 ? 1 : Math.max(0, 1 - (ao - 1) * 0.5);
  });
  const aoNow = Math.abs(i - current);
  const zIndex = count - aoNow;

  const isVideo = item.type === "video";
  const cover = isVideo ? item.cover || "" : item.url;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 rounded-redefine overflow-hidden shadow-redefine-flat bg-third-background/40 cursor-pointer select-none"
      style={{
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        marginTop: -CARD_H / 2,
        x,
        z,
        rotateY,
        scale,
        opacity,
        zIndex,
        pointerEvents: aoNow > 2 ? "none" : "auto",
      }}
      onClick={() => (i === current ? onOpen(item) : onSelect(i))}
    >
      <img
        src={cover}
        alt={item.title}
        loading="lazy"
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
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
}

export default CoverFlow;
