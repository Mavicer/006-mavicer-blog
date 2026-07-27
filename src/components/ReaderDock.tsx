import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Floating "online readers" dock (bottom-left).
 *
 * Since there's no backend, we simulate online-counting purely on the
 * client side using localStorage + BroadcastChannel:
 *
 * - Each tab generates a unique client ID and writes a heartbeat
 *   (timestamp) to localStorage every 15s.
 * - We read all heartbeats, filter to those seen in the last 45s
 *   (3 missed heartbeats = offline), and count unique clients.
 * - Cross-tab sync via BroadcastChannel + storage events.
 *
 * This is approximate (same-machine tabs share localStorage) but
 * gives a non-zero count that reflects real activity. When a real
 * backend lands, replace this with pingOnline().
 */

const HEARTBEAT_KEY = "MAVICER_ONLINE_HEARTBEATS";
const HEARTBEAT_INTERVAL = 15_000; // 15s
const OFFLINE_THRESHOLD = 45_000; // 45s = 3 missed beats

type Heartbeats = Record<string, number>; // clientId → timestamp

function readHeartbeats(): Heartbeats {
  try {
    return JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeHeartbeats(hb: Heartbeats): void {
  localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(hb));
}

function getClientId(): string {
  const key = "MAVICER_ONLINE_CLIENT_ID";
  let v = localStorage.getItem(key);
  if (!v) {
    v = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, v);
  }
  return v;
}

function countOnline(): number {
  const hb = readHeartbeats();
  const now = Date.now();
  let count = 0;
  for (const [id, ts] of Object.entries(hb)) {
    if (now - ts < OFFLINE_THRESHOLD) {
      count++;
    } else {
      // Clean up stale entries
      delete hb[id];
    }
  }
  // Write back cleaned version
  if (Object.keys(hb).length > 0) writeHeartbeats(hb);
  return count;
}

export function ReaderDock() {
  const { pathname } = useLocation();
  const [count, setCount] = useState<number | null>(null);
  const clientId = getClientId();

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("mavicer-online");
    } catch {
      // BroadcastChannel not supported (older browsers) — fall back
      // to storage events only.
    }

    const beat = () => {
      const hb = readHeartbeats();
      hb[clientId] = Date.now();
      writeHeartbeats(hb);
      setCount(countOnline());
      bc?.postMessage({ type: "beat" });
    };

    // Initial beat + count
    beat();

    const interval = setInterval(beat, HEARTBEAT_INTERVAL);

    const onStorage = (e: StorageEvent) => {
      if (e.key === HEARTBEAT_KEY) setCount(countOnline());
    };
    const onBC = () => setCount(countOnline());

    window.addEventListener("storage", onStorage);
    bc?.addEventListener("message", onBC);

    // Cleanup on unmount: remove our heartbeat
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      bc?.removeEventListener("message", onBC);
      bc?.close();
      const hb = readHeartbeats();
      delete hb[clientId];
      writeHeartbeats(hb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, pathname]);

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
