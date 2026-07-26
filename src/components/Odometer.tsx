import { useEffect, useRef, useState } from "react";

/**
 * Lightweight odometer-style rolling digit.
 *
 * Mirrors the original site's `odometer.js` effect on the footer runtime
 * counter: when the value changes, the new digit rolls up into view while
 * the old one rolls out the top. Pure CSS transform animation — no
 * external dependency, no layout shift.
 *
 * Each digit is a vertical strip of "0".."9" plus a trailing "0" for the
 * 9→0 rollover. The strip is translated up by N·1em to reveal digit N.
 * On change we animate the transform; for a wrap (9→0) we animate to the
 * trailing 0 (index 10) then snap back to index 0 with no transition.
 */
export function Odometer({ value }: { value: string | number }) {
  // Keep the key stable per-character-position so a single Digit's internal
  // state survives parent re-renders but resets when the length changes
  // (e.g. day count 9 → 10 adds a digit).
  const str = String(value);
  const chars = str.split("");
  // Length-aware key suffix prevents stale digit state when the string
  // grows/shrinks (e.g. day 99 → 100).
  return (
    <span className="odometer" aria-label={str}>
      {chars.map((d, i) => (
        <Digit key={`${chars.length}-${i}`} char={d} />
      ))}
    </span>
  );
}

const STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function Digit({ char }: { char: string }) {
  const isDigit = /^[0-9]$/.test(char);
  const [pos, setPos] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDigit) return;
    const target = Number(char);
    setPos((prev) => {
      if (prev === null) return target; // first paint, no animation
      if (target >= prev) {
        // normal roll up
        setAnimating(true);
        return target;
      }
      // wrap: roll up past 9 to the trailing 0 (index 10), then snap to 0
      setAnimating(true);
      if (snapTimer.current) clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => {
        setAnimating(false);
        setPos(0);
      }, 420);
      return 10;
    });
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
    };
  }, [char, isDigit]);

  // Clear the animating flag once the transition is done (non-wrap case).
  useEffect(() => {
    if (!animating || pos === null || pos === 10) return;
    const id = setTimeout(() => setAnimating(false), 420);
    return () => clearTimeout(id);
  }, [animating, pos]);

  if (!isDigit) return <span>{char}</span>;

  return (
    <span className="odometer-digit">
      <span
        className="odometer-ribbon"
        style={{
          transform: `translateY(-${pos ?? 0}em)`,
          transition: animating
            ? "transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)"
            : "none",
        }}
      >
        {STRIP.map((d, i) => (
          <span key={i} className="odometer-cell">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

