import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useScrollToTop, useScrollProgress } from "@/hooks/useScroll";

/**
 * Right-side floating toolbar.
 *
 * All icons are inline SVG (no icon-font dependency) so every button is
 * guaranteed to render a visible glyph. The aesthetic stays minimal:
 * thin-stroke, 20px, single-color, matching the Redefine theme.
 *
 * Layout (top → bottom):
 *   [scroll-to-top]   appears after scrolling; shows % normally, arrow on hover
 *   [tools toggle]    always visible; chevron indicates expand state
 *        ┌─ expanded panel (slides DOWN) ─┐
 *        │  search                          │
 *        │  theme (sun/moon)                │
 *        │  font +                          │
 *        │  font −                          │
 *        │  scroll to bottom                 │
 *        └──────────────────────────────────┘
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
          >
            <span className="percent">{percent}</span>
            <SvgUp className="arrow-up" />
            <span className="tool-label">回到顶部</span>
          </li>
          <li
            className="right-bottom-tools toggle-tools-list flex justify-center items-center"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <SvgChevronUp /> : <SvgChevronDown />}
            <span className="tool-label">{expanded ? "收起" : "工具"}</span>
          </li>
        </ul>

        <ul className={`hidden-tools-list ${expanded ? "show" : ""}`}>
          <li
            className="right-bottom-tools tool-search flex justify-center items-center"
            onClick={() => { onSearch(); setExpanded(false); }}
          >
            <SvgSearch />
            <span className="tool-label">搜索</span>
          </li>
          <li
            className="right-bottom-tools tool-dark-light-toggle flex justify-center items-center"
            onClick={toggle}
          >
            {effectiveMode === "dark" ? <SvgSun /> : <SvgMoon />}
            <span className="tool-label">
              {effectiveMode === "dark" ? "日间模式" : "夜间模式"}
            </span>
          </li>
          <li
            className="right-bottom-tools tool-font-adjust-plus flex justify-center items-center"
            onClick={() => adjustFont(1)}
          >
            <SvgZoomIn />
            <span className="tool-label">放大字号</span>
          </li>
          <li
            className="right-bottom-tools tool-font-adjust-minus flex justify-center items-center"
            onClick={() => adjustFont(-1)}
          >
            <SvgZoomOut />
            <span className="tool-label">缩小字号</span>
          </li>
          <li
            className="right-bottom-tools tool-scroll-to-bottom flex justify-center items-center"
            onClick={() => { scrollToBottom(); setExpanded(false); }}
          >
            <SvgDoubleDown />
            <span className="tool-label">滚动到底</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── Inline SVG icons ──────────────────────────────────────────────
   20×20, stroke-based, 1.5px weight. No fill so they inherit the
   button's currentColor (including hover state). */

type IconProps = { className?: string };

function SvgUp({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function SvgChevronDown({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SvgChevronUp({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

function SvgSearch({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SvgSun({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function SvgMoon({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SvgZoomIn({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function SvgZoomOut({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function SvgDoubleDown({ className = "" }: IconProps) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6M6 5l6 6 6-6" />
    </svg>
  );
}
