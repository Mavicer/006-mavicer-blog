import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getVisits, reportVisit, type VisitStats } from "@/lib/api";

type Visit = { path: string; id: string; started: boolean; counted: boolean; visibleMs: number };

export function useVisitorStats() {
  const { pathname } = useLocation();
  const visit = useRef<Visit | null>(null);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!visit.current || visit.current.path !== pathname) {
      visit.current = { path: pathname, id: crypto.randomUUID(), started: false, counted: false, visibleMs: 0 };
    }
    const current = visit.current;
    let stopped = false;
    let busy = false;
    let wrote = false;
    let nextAttempt = 0;
    let visibleSince: number | null = document.visibilityState === "visible" ? performance.now() : null;

    function elapsed() {
      const now = performance.now();
      if (visibleSince !== null) current.visibleMs += now - visibleSince;
      visibleSince = document.visibilityState === "visible" ? now : null;
    }

    async function update(presenceOnly = false) {
      if (busy || stopped || document.visibilityState !== "visible" || performance.now() < nextAttempt) return;
      elapsed();
      const kind = !current.started ? "start" : presenceOnly || current.counted ? "heartbeat" : "pageview";
      if (kind === "pageview" && current.visibleMs < 10_000) return;
      busy = true;
      try {
        const result = await reportVisit({ kind, path: pathname, ...(kind !== "heartbeat" ? { event_id: current.id } : {}) });
        if (kind === "start") {
          current.started = true;
          // Ten visible seconds after the server acknowledges the start.
          current.visibleMs = 0;
          visibleSince = document.visibilityState === "visible" ? performance.now() : null;
        }
        if (kind === "pageview") current.counted = true;
        if (!stopped) { wrote = true; setStats(result); setUnavailable(false); }
      } catch (error) {
        if (!stopped) {
          if ((error as { status?: number }).status === 409) {
            current.id = crypto.randomUUID(); current.started = false; current.counted = false; current.visibleMs = 0;
          } else {
            nextAttempt = performance.now() + 30_000;
            setUnavailable(true);
          }
        }
      } finally { busy = false; }
    }

    function visibility() {
      elapsed();
      if (document.visibilityState === "visible") void update(true);
    }

    void getVisits().then((result) => {
      if (!stopped && !wrote) { setStats(result); setUnavailable(false); }
    }).catch(() => { if (!stopped && !wrote) setUnavailable(true); });
    // Cancel StrictMode's extra mount before any write starts.
    const start = setTimeout(() => { void update(); }, 100);
    const qualification = setInterval(() => { if (!current.counted) void update(); }, 1000);
    // Keep presence and other visitors' counts current before qualification too.
    const heartbeat = setInterval(() => { void update(true); }, 10_000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      elapsed();
      stopped = true;
      clearTimeout(start);
      clearInterval(qualification);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pathname, retry]);

  return { stats, unavailable, retry: () => setRetry((value) => value + 1) };
}
