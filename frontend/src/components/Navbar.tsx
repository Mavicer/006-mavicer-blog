import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "@/config/nav";
import { site } from "@/config/site";
import { useNavbarShrink } from "@/hooks/useScroll";
import { ICONS } from "@/components/icons";

export function Navbar({ onSearch }: { onSearch: () => void }) {
  const shrink = useNavbarShrink(40);
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const isHome = pathname === "/";

  const isActive = (item: NavItem) =>
    item.path ? pathname === item.path : false;

  // ── Edge-swipe-to-close ──────────────────────────────────────────
  const touchStartX = useRef(0);
  const isDragging = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!drawerOpen) return;
      const x = e.touches[0].clientX;
      if (x > 40) return;
      touchStartX.current = x;
      isDragging.current = true;
    },
    [drawerOpen]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      const delta = e.touches[0].clientX - touchStartX.current;
      if (delta > 0) setDragX(delta);
    },
    []
  );

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const screenWidth = window.innerWidth;
    if (dragX > screenWidth * 0.3) {
      setDrawerOpen(false);
    }
    setDragX(0);
  }, [dragX]);

  return (
    <>
      <div
        className={`navbar-container ${shrink ? "navbar-shrink" : ""}`}
      >
        <div
          className={`navbar-content transition-navbar ${
            isHome && !shrink ? "has-home-banner" : ""
          } ${shrink ? "navbar-shrink" : ""}`}
        >
          {/* Left: logo */}
          <div className="left">
            <Link className="logo-title" to="/">
              <h1>{site.name}</h1>
            </Link>
          </div>

          {/* Right: desktop nav with inline SVG icons */}
          <div className="right hidden md:block">
            <ul className="navbar-list">
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.svg];
                return (
                  <li key={item.label} className="navbar-item">
                    {item.path ? (
                      <Link
                        to={item.path}
                        className={`navbar-link ${isActive(item) ? "active" : ""}`}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <a className="navbar-link navbar-link-dropdown" href="#" onClick={(e) => e.preventDefault()}>
                        <Icon />
                        <span>{item.label}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                        {item.submenus && (
                          <ul className="sub-menu">
                            {item.submenus.map((sub) => (
                              <li key={sub.label}>
                                {sub.external ? (
                                  <a
                                    href={sub.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {sub.label}
                                  </a>
                                ) : (
                                  <Link to={sub.path}>{sub.label}</Link>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </a>
                    )}
                  </li>
                );
              })}
              {/* Search — always last, fixed right */}
              <li
                className="navbar-item navbar-search cursor-pointer"
                onClick={onSearch}
              >
                {ICONS.search({})}
              </li>
            </ul>
          </div>

          {/* Mobile */}
          <div className="right md:hidden flex items-center gap-4">
            <div
              className="icon-item search search-popup-trigger cursor-pointer text-lg"
              onClick={onSearch}
            >
              <i className="fa-solid fa-magnifying-glass" />
            </div>
            <div
              className="icon-item navbar-bar cursor-pointer flex flex-col justify-center w-6 h-5"
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <span
                className={`block h-[2px] w-full bg-current transition-transform ${
                  drawerOpen ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`navbar-bar-middle block h-[2px] w-full bg-current my-[5px] transition-opacity ${
                  drawerOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-[2px] w-full bg-current transition-transform ${
                  drawerOpen ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edge-swipe capture zone */}
      {drawerOpen && (
        <div
          className="fixed top-0 left-0 w-[40px] h-dvh z-[1008] md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={`navbar-drawer fixed top-0 left-0 w-full h-dvh bg-background flex flex-col justify-between transition-transform duration-300 z-[1007] ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={
          isDragging.current && dragX > 0
            ? {
                transform: `translateX(${dragX}px)`,
                transition: "none",
              }
            : undefined
        }
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ul className="drawer-navbar-list flex flex-col px-4 justify-center items-start pt-20">
          {NAV_ITEMS.map((item) =>
            item.path ? (
              <li
                key={item.label}
                className="drawer-navbar-item text-base my-1.5 flex flex-col w-full"
              >
                <Link
                  className={`py-1.5 px-2 flex flex-row items-center justify-between gap-1 hover:!text-primary active:!text-primary text-2xl font-semibold group border-b border-border hover:border-primary w-full ${
                    isActive(item) ? "active !text-primary" : ""
                  }`}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span>{item.label}</span>
                  <i className={`${item.icon} fa-sm fa-fw`} />
                </Link>
              </li>
            ) : (
              <li
                key={item.label}
                className="drawer-navbar-item text-base my-1.5 flex flex-col w-full"
              >
                <div className="py-1.5 px-2 flex flex-row items-center justify-between gap-1 cursor-pointer text-2xl font-semibold group border-b border-border w-full">
                  <span>{item.label}</span>
                  <i className="fa-solid fa-chevron-right fa-sm fa-fw" />
                </div>
                <div className="flex-col items-start px-2 py-2">
                  {item.submenus?.map((sub) =>
                    sub.external ? (
                      <a
                        key={sub.label}
                        className="block text-third-text-color text-xl py-1"
                        href={sub.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDrawerOpen(false)}
                      >
                        {sub.label}
                      </a>
                    ) : (
                      <Link
                        key={sub.label}
                        className="block text-third-text-color text-xl py-1"
                        to={sub.path}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {sub.label}
                      </Link>
                    )
                  )}
                </div>
              </li>
            )
          )}
        </ul>
      </div>

      {/* Window mask */}
      <div
        className={`window-mask fixed top-0 left-0 w-full h-screen bg-black/40 z-[1001] ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        } transition-opacity duration-200`}
        onClick={() => setDrawerOpen(false)}
      />
    </>
  );
}
