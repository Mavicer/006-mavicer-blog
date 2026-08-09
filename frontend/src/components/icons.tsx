// Shared inline-SVG icon map (minimal stroke style: 22px, strokeWidth 1.5,
// stroke=currentColor). Extracted from Navbar.tsx so Sidebar / ArticleCard can
// reuse the same icon language. Add new icons here, not inline.
import type { NavIcon } from "@/config/nav";

type IconProps = React.SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const ICONS: Record<NavIcon, React.FC<IconProps>> = {
  home: (p) => (
    <svg {...base} {...p}>
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  archive: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v12h14V8" />
      <path d="M10 12h4" />
    </svg>
  ),
  user: (p) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  code: (p) => (
    <svg {...base} {...p}>
      <path d="M8 6l-6 6 6 6" />
      <path d="M16 6l6 6-6 6" />
    </svg>
  ),
  folder: (p) => (
    <svg {...base} {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
  camera: (p) => (
    <svg {...base} {...p}>
      <path d="M3 7h3l2-2h8l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  search: (p) => (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </svg>
  ),
  // Calendar — article publish date. Rounded body + top ticks + midline.
  calendar: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </svg>
  ),
};
