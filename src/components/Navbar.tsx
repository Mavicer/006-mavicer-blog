import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "@/config/nav";
import { site } from "@/config/site";
import { useNavbarShrink } from "@/hooks/useScroll";

export function Navbar({ onSearch }: { onSearch: () => void }) {
  const shrink = useNavbarShrink(40);
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isHome = pathname === "/";

  const isActive = (item: NavItem) =>
    item.path ? pathname === item.path : false;

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

          {/* Right: desktop */}
          <div className="right hidden md:block">
            <ul className="navbar-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.label} className="navbar-item">
                  {item.path ? (
                    <Link
                      to={item.path}
                      className={isActive(item) ? "active" : ""}
                    >
                      <i className={`${item.icon} fa-fw`} />
                      {item.label}
                    </Link>
                  ) : (
                    <a className="has-dropdown" href="#" onClick={(e) => e.preventDefault()}>
                      <i className={`${item.icon} fa-fw`} />
                      {item.label}
                      <i className="fa-solid fa-chevron-down fa-fw text-xs" />
                      {item.submenus && (
                        <ul className="sub-menu">
                          {item.submenus.map((sub) => (
                            <li key={sub.label}>
                              {sub.external ? (
                                <a
                                  href={sub.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
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
              ))}
              <li
                className="navbar-item search search-popup-trigger cursor-pointer"
                onClick={onSearch}
              >
                <i className="fa-solid fa-magnifying-glass" />
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

      {/* Mobile drawer */}
      <div
        className={`navbar-drawer fixed top-0 left-0 w-full h-dvh bg-background flex flex-col justify-between transition-transform duration-300 z-[1007] ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
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
