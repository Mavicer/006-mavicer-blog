import { useEffect, useState } from "react";

/**
 * Floating visitors dock (bottom-left).
 *
 * Reads the busuanzi site_uv value (total unique visitors, cross-device)
 * which is loaded as a third-party script in index.html. Falls back to
 * "—" if the script hasn't populated the value yet.
 *
 * The previous "online readers" count used localStorage heartbeats which
 * are per-device only — 3 devices would each show 1. busuanzi tracks
 * globally and works cross-device.
 *
 * When a real backend lands, replace this with a WebSocket-based
 * presence system for true real-time online count.
 */

export function ReaderDock() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 20 × 500ms = 10s max wait

    const check = () => {
      const el = document.getElementById("busuanzi_value_site_uv");
      if (el && el.textContent) {
        const n = parseInt(el.textContent, 10);
        if (!isNaN(n) && n > 0) {
          setCount(n);
          return;
        }
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(check, 500);
      }
    };

    check();

    // Also re-check when busuanzi fires its custom event
    const onBusuanzi = () => {
      setTimeout(check, 100);
    };
    document.addEventListener("busuanzi:value", onBusuanzi);

    return () => document.removeEventListener("busuanzi:value", onBusuanzi);
  }, []);

  return (
    <div
      className="aleph-reader-dock"
      aria-live="polite"
      style={{
        opacity: count === null ? 0 : 1,
        transform: count === null ? "translateY(20px)" : "translateY(0)",
      }}
    >
      <i className="fa-regular fa-eye" />
      <span>{count === null ? "访问 — 人" : `访问 ${count} 人`}</span>
    </div>
  );
}
