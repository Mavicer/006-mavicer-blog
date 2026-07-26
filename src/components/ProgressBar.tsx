import { useScrollProgress } from "@/hooks/useScroll";

export function ProgressBar() {
  const { progress } = useScrollProgress();
  return (
    <div className="progress-bar-container fixed top-0 left-0 w-full z-[1100] pointer-events-none">
      <span
        className="pjax-progress-bar block h-[2px] origin-left"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
