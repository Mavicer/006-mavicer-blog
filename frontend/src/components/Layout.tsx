import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RightSideTools } from "./RightSideTools";
import { SearchPopup, useSearchPopup } from "./SearchPopup";
import { ImageViewerProvider } from "./ImageViewer";
import { ProgressBar } from "./ProgressBar";
import { AuthProvider } from "@/hooks/useAuth";
import { useScrollReset } from "@/hooks/useScroll";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

export default function Layout({ children }: { children: React.ReactNode }) {
  useScrollReset();
  const search = useSearchPopup();
  const { pathname } = useLocation();
  const { effectiveMode } = useTheme();
  useEffect(() => {
    const home = pathname === "/";
    document.documentElement.classList.toggle("home-page", home);
    // Older Safari uses theme-color; newer Safari also samples the canvas.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",
      home ? (effectiveMode === "dark" ? "#182b40" : "#f5d0a6")
        : (effectiveMode === "dark" ? "#202124" : "#ffffff"));
    return () => document.documentElement.classList.remove("home-page");
  }, [pathname, effectiveMode]);
  return (
    <AuthProvider>
      <ImageViewerProvider>
        <ProgressBar />
        <Navbar onSearch={() => search.open()} />
        <main id="swup">{children}</main>
        <Footer />
        <RightSideTools onSearch={() => search.open()} />
        <SearchPopup popup={search} />
      </ImageViewerProvider>
    </AuthProvider>
  );
}
