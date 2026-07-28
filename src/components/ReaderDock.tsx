import { useVisitorStats } from "@/hooks/useVisitorStats";

/**
 * Floating visitors dock (bottom-left).
 * Shares the same useVisitorStats hook as Footer — no duplicate
 * busuanzi element IDs. Shows UV (unique visitors) + base offset.
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
      <span>访问 {uv} 人</span>
    </div>
  );
}
