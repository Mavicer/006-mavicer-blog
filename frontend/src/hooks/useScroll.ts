import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

/**
 * useScrollProgress — top progress bar width + back-to-top percentage.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const ratio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      setProgress(Math.min(1, ratio));
      setPercent(Math.min(100, Math.round(ratio * 100)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { progress, percent };
}

/**
 * useHomeBannerBlur — progressively blurs the fixed home banner background as the
 * user scrolls down from the hero, mirroring the original Redefine theme's
 * updateHomeBannerBlur() logic. The blur amount is 0 until the user has scrolled
 * past ~half the viewport height, then snaps to maxBlur. Returns the blur px.
 */
export function useHomeBannerBlur(maxBlur = 15) {
  const [blur, setBlur] = useState(0);
  useEffect(() => {
    const trigger = window.innerHeight * 0.5;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setBlur(y >= trigger ? maxBlur : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [maxBlur]);
  return blur;
}

/**
 * useNavbarShrink — true when scrolled past threshold (mirrors Redefine navbar-shrink).
 */
export function useNavbarShrink(threshold = 40) {
  const [shrink, setShrink] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setShrink((document.documentElement.scrollTop || document.body.scrollTop) > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return shrink;
}

/**
 * useScrollToTop — returns true when the button should be visible.
 */
export function useScrollToTop(threshold = 200) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setVisible((document.documentElement.scrollTop || document.body.scrollTop) > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return visible;
}

/**
 * useScrollReset — scrolls to top on route change (replaces Swup scroll reset).
 * Also prevents browser from restoring scroll position on page reload.
 */
export function useScrollReset() {
  const { pathname } = useLocation();

  // On mount: prevent browser scroll restoration on reload.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => {
      // Restore default when leaving the app (not strictly necessary).
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  // On route change: scroll to top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
}

/**
 * useRuntimeDays — days/hours/minutes/seconds since footerStart.
 */
export function useRuntime(startISO: string) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const start = new Date(startISO.replace(/-/g, "/")).getTime();
    const tick = () => {
      const diff = Math.max(0, Date.now() - start);
      const s = Math.floor(diff / 1000);
      setT({
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startISO]);
  return t;
}
