import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { pingOnline } from "@/lib/api";

/** Floating "online readers" dock (bottom-left), pings backend every 30s. */
export function ReaderDock() {
  const { pathname } = useLocation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const n = await pingOnline(pathname);
        if (active) setCount(n);
      } catch {
        // keep the last known count rather than nulling out the pill
        if (active && count === null) setCount(0);
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Render but hidden until first ping resolves — preserves layout slot
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
      <span>{count === null ? "在线 — 人" : `在线 ${count} 人`}</span>
    </div>
  );
}
