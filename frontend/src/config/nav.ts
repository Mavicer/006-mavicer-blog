import { NEXUS_LAUNCHED, NEXUS_URL } from "./nexus";
// Centralized layout constants mirroring the original theme config.
export const LAYOUT = {
  contentMaxWidth: "1000px",
  navbarHomeWidth: "1200px",
  navbarPageWidth: "1000px",
  sidebarWidth: 240,
  sidebarMargin: 38,
  homeContentMargin: 38,
  navbarHeight: 64,
  navbarShrinkHeight: 50.4,
  stickyTop: 70,
};

export type NavIcon =
  | "home"
  | "archive"
  | "user"
  | "code"
  | "folder"
  | "camera"
  | "search"
  | "calendar";

export type NavItem = {
  label: string;
  path?: string;
  svg: NavIcon; // inline SVG icon (desktop navbar + mobile drawer)
  external?: boolean;
  submenus?: { label: string; path: string; external?: boolean }[];
};

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "首页", path: "/", svg: "home" },
  { label: "归档", path: "/archives", svg: "archive" },
  {
    label: "关于",
    svg: "user",
    submenus: [
      { label: "ME", path: "/about" },
      { label: "GITHUB", path: "https://github.com/Mavicer", external: true },
    ],
  },
  { label: "PROJECTS", path: "/projects", svg: "code" },
  { label: "展示", path: "/gallery", svg: "camera" },
  { label: "分类", path: "/categories", svg: "folder" },
  { label: "账户", path: "/account", svg: "user" },
];

export function buildNavItems(
  nexusLaunched: boolean,
  nexusUrl: string,
): NavItem[] {
  return BASE_NAV_ITEMS.map((item) =>
    item.path === "/categories" && nexusLaunched
      ? { label: "Nexus", path: nexusUrl, svg: "code", external: true }
      : item,
  );
}
export const NAV_ITEMS = buildNavItems(NEXUS_LAUNCHED, NEXUS_URL);

export type SidebarLink = {
  label: string;
  path: string;
  svg: NavIcon; // inline SVG icon (desktop sidebar)
};

export const SIDEBAR_LINKS: SidebarLink[] = [
  { label: "About", path: "/about", svg: "user" },
  { label: "Archives", path: "/archives", svg: "archive" },
  { label: "Projects", path: "/projects", svg: "code" },
  { label: "Gallery", path: "/gallery", svg: "camera" },
  { label: "Categories", path: "/categories", svg: "folder" },
];
