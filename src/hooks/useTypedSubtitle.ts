import { useEffect, useRef } from "react";

/**
 * Minimal Typed.js-like effect: types the subtitle phrases character by character,
 * with smart backspace (only erases the part that differs), looping.
 * Mirrors the original site's Typed config:
 *   typing_speed:100, backing_speed:80, starting_delay:500, backing_delay:1500, loop, smart_backspace
 */
export function useTypedSubtitle(
  elRef: React.RefObject<HTMLElement>,
  phrases: string[]
) {
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    if (!elRef.current || phrases.length === 0) return;
    const el = elRef.current;
    stopped.current = false;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    const tick = () => {
      if (stopped.current) return;
      const phrase = phrases[phraseIdx];
      if (!deleting) {
        charIdx++;
        el.textContent = phrase.slice(0, charIdx);
        if (charIdx >= phrase.length) {
          deleting = true;
          timer.current = setTimeout(tick, 1500);
          return;
        }
        timer.current = setTimeout(tick, 100);
      } else {
        // smart backspace: if next phrase shares a prefix, only erase the differing tail.
        // When the next phrase is identical (single-phrase loop), there is no
        // differing tail to preserve — delete the whole string.
        const next = phrases[(phraseIdx + 1) % phrases.length];
        const common = next === phrase ? "" : commonPrefix(phrase, next);
        if (charIdx > common.length) {
          charIdx--;
          el.textContent = phrase.slice(0, charIdx);
          timer.current = setTimeout(tick, 80);
        } else {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          charIdx = common.length;
          el.textContent = phrases[phraseIdx].slice(0, charIdx);
          timer.current = setTimeout(tick, 500);
        }
      }
    };

    timer.current = setTimeout(tick, 500);
    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [elRef, phrases]);
}

function commonPrefix(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}
