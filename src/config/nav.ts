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

export type NavItem = {
  label: string;
  path?: string;
  icon: string; // fa class
  external?: boolean;
  submenus?: { label: string; path: string; external?: boolean }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "首页", path: "/", icon: "fa-regular fa-house" },
  { label: "归档", path: "/archives", icon: "fa-regular fa-archive" },
  {
    label: "关于",
    icon: "fa-regular fa-user",
    submenus: [
      { label: "ME", path: "/about" },
      { label: "GITHUB", path: "https://github.com/Mavicer", external: true },
    ],
  },
  { label: "PROJECTS", path: "/projects", icon: "fa-regular fa-code" },
  { label: "展示", path: "/gallery", icon: "fa-regular fa-images" },
  { label: "分类", path: "/categories", icon: "fa-regular fa-folder" },
];

export const SIDEBAR_LINKS = [
  { label: "About", path: "/about", icon: "fa-regular fa-user" },
  { label: "Archives", path: "/archives", icon: "fa-regular fa-archive" },
  { label: "Projects", path: "/projects", icon: "fa-regular fa-code" },
  { label: "Gallery", path: "/gallery", icon: "fa-regular fa-images" },
  { label: "Categories", path: "/categories", icon: "fa-regular fa-folder" },
];
