import { useEffect, useState } from "react";

/**
 * useVisitorStats — calls the Cloudflare Worker API to get real
 * server-side UV (unique visitors in 24h) and PV (total page views).
 *
 * API endpoint: /api/visitor
 * Response: { uv: number, pv: number }
 *
 * On failure, returns loading=false with uv/pv = null.
 * The caller should display "--" when null.
 */

type VisitorData = {
  uv: number | null;
  pv: number | null;
  loading: boolean;
};

const FALLBACK: VisitorData = { uv: null, pv: null, loading: false };

export function useVisitorStats(): VisitorData {
  const [state, setState] = useState<VisitorData>({
    uv: null,
    pv: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/visitor", {
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { uv: number; pv: number }) => {
        if (cancelled) return;
        setState({
          uv: data.uv ?? 0,
          pv: data.pv ?? 0,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState(FALLBACK);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
