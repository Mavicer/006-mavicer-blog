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
 * Cards arrange in 3D space around a centered "spotlight" card. The three
 * transform axes — horizontal x, depth z, and rotateY — are each INDEPENDENT
 * tunable functions of the card's offset from center, NOT coupled on a single
 * shared angle (the cylinder approach couples them via one θ, which forces deep
 * z to co-occur with wide x and pushes side cards off-screen — that was the bug).
 *
 *   x       = offset · SPACING          // linear horizontal spacing (world px)
 *   z       = −|offset|·Z_STEP           // side cards retreat in depth (negative = farther)
 *   rotateY = sign(offset)·min(|offset|,2)·ANGLE   // turn to face center; capped at 84°
 *
 * Apparent size shrink on side cards comes from `perspective` (P=1000) acting
 * on their z: z=−130 → ~13% smaller, z=−260 → ~23% smaller. rotateY further
 * foreshortens their apparent width (cos 42° ≈ 0.74). Together they read as
 * genuine depth layering, not a 2D pile-up. The centered card (z=0, rotateY=0)
 * stays full-size and frontmost; its higher zIndex covers the near edge of the
 * receding side cards (~30px overlap) — that overlap is intentional Cover Flow
 * layering, distinct from the flat same-plane stacking that broke the prior version.
 *
 * `pos` is a CONTINUOUS MotionValue (card units; integer = a card centered).
 * It is driven live by the pan gesture so cards flow with the finger ("flipping
 * through a record collection"), then springs to the nearest integer on release.
 *
 * DOM is three layers:
 *   outer  (overflow-hidden — clips side cards at the stage edge, 2D screen space)
 *     → middle ([perspective:1000px] — the vanishing point, NO overflow here)
 *       → track (motion.div, [transform-style:preserve-3d], onPan — does NOT move)
 *         → CoverCard (motion.div, x/z/rotateY/scale/opacity via useTransform on `pos`)
 *
 * `transform-style: preserve-3d` on the track is mandatory — `perspective` only
 * applies to DIRECT children, and the cards are grandchildren. Drop it and the
 * whole thing collapses to flat 2D slides.
 *
 * Transform order: framer-motion emits `translate3d(x,0,z) rotateY(θ) scale(s)`,
 * so rotateY applies first (around the card's own center = tilt in place), then
 * translate moves the tilted card to its slot. Correct Cover Flow look.
 *
 * Rotation sign: `rotateY(+θ)` turns a card's face toward the right, so LEFT-side
 * cards take `+` and RIGHT-side cards take `−` — both angle inward to face center.
 * `Math.sign(offset)` yields this naturally.
 */

const CARD_W = 260;
const CARD_H = 195; // 4:3 of CARD_W
// Decoupled geometry constants — each axis tuned independently.
const SPACING = 180; // px between adjacent card centers (world space)
const Z_STEP = 130; // px depth retreat per |offset| step
const ANGLE = 42; // deg rotateY per |offset| step, capped at 2·ANGLE = 84°

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

  // Continuous carousel position (card units). Integer = a card centered.
  const pos = useMotionValue(current);
  // Position captured at pan start — deltas are measured from here.
  const baseRef = useRef(current);

  const springTo = (target: number) => {
    animate(
      pos,
      target,
      reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }
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
    // Drag left → offset.x < 0 → pos increases → next card flows into center.
    pos.set(baseRef.current - info.offset.x / SPACING);
  };
  const onPanEnd = (_e: unknown, info: PanInfo) => {
    const moved = -info.offset.x / SPACING;
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
      <div className="[perspective:1000px]">
        <motion.div
          className="[transform-style:preserve-3d] relative h-[220px] cursor-grab active:cursor-grabbing touch-pan-y"
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

/** Single card in the 3D arrangement. Its own component so useTransform hooks
 *  are called unconditionally per card (rules of hooks in a loop). */
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
  // offset = i − pos (continuous). Each axis is an INDEPENDENT function of it —
  // NOT a shared angle. This is the fix: depth (z) no longer drags x with it.
  const x = useTransform(pos, (p) => (i - p) * SPACING);
  // Side cards retreat in depth; far cards cap at 3 steps so they park behind.
  const z = useTransform(pos, (p) => -Math.min(Math.abs(i - p), 3) * Z_STEP);
  // Turn to face center; cap rotation at 2·ANGLE so far cards don't exceed 84°.
  const rotateY = useTransform(pos, (p) => {
    const o = i - p;
    if (o === 0) return 0;
    return Math.sign(o) * Math.min(Math.abs(o), 2) * ANGLE;
  });
  // Subtle center pop on top of the perspective-driven size shrink.
  const scale = useTransform(pos, (p) => {
    const ao = Math.abs(i - p);
    return 1 + (0.5 - Math.min(ao, 0.5)) * 0.1;
  });
  const opacity = useTransform(pos, (p) => {
    const ao = Math.abs(i - p);
    return ao <= 1.5 ? 1 : Math.max(0, 1 - (ao - 1.5) * 0.6);
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
