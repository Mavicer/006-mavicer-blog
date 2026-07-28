import { useVisitorStats } from "@/hooks/useVisitorStats";

/**
 * Floating visitors dock (bottom-left).
 * Uses the shared useVisitorStats hook (Cloudflare Worker API).
 * Shows UV (unique visitors in 24h).
 */
export function ReaderDock() {
  const { uv } = useVisitorStats();

  return (
    <div
      className="aleph-reader-dock"
      aria-live="polite"
      style={{
        opacity: 1,
        transform: "translateY(0)",
      }}
    >
      <i className="fa-regular fa-eye" />
      <span>访问 {uv === null ? "--" : uv} 人</span>
    </div>
  );
}
