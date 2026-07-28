import { useEffect, useState } from "react";

/**
 * useVisitorStats — cross-device visitor counter using busuanzi.
 *
 * UV (unique visitors): same device counts once, busuanzi deduplicates
 *   server-side via IP + browser fingerprint.
 * PV (page views): increments on every page open, any device.
 *
 * Base offsets: UV starts at 20, PV starts at 120.
 * These offsets are added on top of busuanzi's real counts so the
 * counter doesn't start from 0/1 on a freshly deployed site.
 *
 * busuanzi script is loaded in index.html and populates
 * #busuanzi_value_site_uv and #busuanzi_value_site_pv spans.
 */

const UV_OFFSET = 20;
const PV_OFFSET = 120;

export function useVisitorStats() {
  const [uv, setUv] = useState<number>(UV_OFFSET);
  const [pv, setPv] = useState<number>(PV_OFFSET);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 20 × 500ms = 10s

    const check = () => {
      const uvEl = document.getElementById("busuanzi_value_site_uv");
      const pvEl = document.getElementById("busuanzi_value_site_pv");

      let gotUv = false;
      let gotPv = false;

      if (uvEl && uvEl.textContent) {
        const n = parseInt(uvEl.textContent, 10);
        if (!isNaN(n) && n >= 0) {
          setUv(n + UV_OFFSET);
          gotUv = true;
        }
      }

      if (pvEl && pvEl.textContent) {
        const n = parseInt(pvEl.textContent, 10);
        if (!isNaN(n) && n >= 0) {
          setPv(n + PV_OFFSET);
          gotPv = true;
        }
      }

      if (gotUv && gotPv) return; // both ready

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(check, 500);
      }
    };

    check();

    // busuanzi fires a custom event when data is ready
    const onBusuanzi = () => setTimeout(check, 100);
    document.addEventListener("busuanzi:value", onBusuanzi);

    return () => document.removeEventListener("busuanzi:value", onBusuanzi);
  }, []);

  return { uv, pv };
}
