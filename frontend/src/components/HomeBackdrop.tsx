import { useLocation } from "react-router-dom";
import { useAppearance } from "@/hooks/useAppearance";
import { useHomeBannerBlur } from "@/hooks/useScroll";

// Keep the image layer mounted when routes change. Its visibility remains home-only.
export function HomeBackdrop() {
  const { pathname } = useLocation();
  const { settings, wallpaper } = useAppearance();
  const blur = useHomeBannerBlur(settings.scrollBlur ? 15 : 0);
  return <div aria-hidden="true" className="home-banner-background fixed top-0 left-0 w-screen h-screen box-border bg-cover"
    style={{ visibility: pathname === "/" ? "visible" : "hidden", backgroundImage: `url("${wallpaper}")`, backgroundPosition: "center", zIndex: 0,
      transform: `scale(${Math.max(blur, settings.blur) > 0 ? 1.06 : 1})`,
      filter: `blur(${Math.max(blur, settings.blur)}px) brightness(${settings.brightness / 100})` }} />;
}
