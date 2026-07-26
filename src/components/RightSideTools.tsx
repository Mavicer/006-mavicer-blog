import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useScrollToTop, useScrollProgress } from "@/hooks/useScroll";

/**
 * Right-side floating toolbar — minimal, label-on-hover, slides DOWN.
 *
 * Layout (top → bottom):
 *   [scroll-to-top]   appears after scrolling; shows % normally, arrow on hover
 *   [tools toggle]    always visible; chevron up/down indicates expand state
 *        ┌─ expanded panel (slides DOWN) ─┐
 *        │  search                          │
 *        │  theme (sun/moon)                │
 *        │  font +                          │
 *        │  font −                          │
 *        │  scroll to bottom                 │
 *        └──────────────────────────────────┘
 *
 * Every button has an icon AND a hover label so its function is
 * unambiguous while staying minimal.
 */
export function RightSideTools({ onSearch }: { onSearch: () => void }) {
  const { effectiveMode, toggle } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const showTop = useScrollToTop(200);
  const { percent } = useScrollProgress();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });

  const adjustFont = (delta: number) => {
    const root = document.documentElement;
    const cur = parseFloat(getComputedStyle(root).fontSize) || 16;
    const next = Math.min(22, Math.max(13, cur + delta));
    root.style.fontSize = `${next}px`;
  };

  return (
    <div className="right-side-tools-container">
      <div className="side-tools-container">
        <ul className="visible-tools-list">
          <li
            className={`right-bottom-tools tool-scroll-to-top ${
              showTop ? "show" : ""
            } flex justify-center items-center`}
            onClick={scrollToTop}
            title="回到顶部"
          >
            <i className="arrow-up fas fa-arrow-up" />
            <span className="percent">{percent}</span>
            <span className="tool-label">回到顶部</span>
          </li>
          <li
            className="right-bottom-tools toggle-tools-list flex justify-center items-center"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "收起" : "工具"}
            aria-expanded={expanded}
          >
            <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} />
            <span className="tool-label">{expanded ? "收起" : "工具"}</span>
          </li>
        </ul>

        <ul className={`hidden-tools-list ${expanded ? "show" : ""}`}>
          <li
            className="right-bottom-tools tool-search flex justify-center items-center"
            onClick={() => {
              onSearch();
              setExpanded(false);
            }}
            title="搜索"
          >
            <i className="fa-solid fa-magnifying-glass" />
            <span className="tool-label">搜索</span>
          </li>
          <li
            className="right-bottom-tools tool-dark-light-toggle flex justify-center items-center"
            onClick={toggle}
            title="明暗切换"
          >
            <i className={`fa-solid ${effectiveMode === "dark" ? "fa-sun" : "fa-moon"}`} />
            <span className="tool-label">
              {effectiveMode === "dark" ? "日间模式" : "夜间模式"}
            </span>
          </li>
          <li
            className="right-bottom-tools tool-font-adjust-plus flex justify-center items-center"
            onClick={() => adjustFont(1)}
            title="放大字号"
          >
            <i className="fa-solid fa-magnifying-glass-plus" />
            <span className="tool-label">放大字号</span>
          </li>
          <li
            className="right-bottom-tools tool-font-adjust-minus flex justify-center items-center"
            onClick={() => adjustFont(-1)}
            title="缩小字号"
          >
            <i className="fa-solid fa-magnifying-glass-minus" />
            <span className="tool-label">缩小字号</span>
          </li>
          <li
            className="right-bottom-tools tool-scroll-to-bottom flex justify-center items-center"
            onClick={() => {
              scrollToBottom();
              setExpanded(false);
            }}
            title="滚动到底"
          >
            <i className="fa-solid fa-angles-down" />
            <span className="tool-label">滚动到底</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
