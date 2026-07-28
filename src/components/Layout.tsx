import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RightSideTools } from "./RightSideTools";
import { SearchPopup, useSearchPopup } from "./SearchPopup";
import { ImageViewerProvider } from "./ImageViewer";
import { AccountDock } from "./AccountDock";
import { ProgressBar } from "./ProgressBar";
import { AuthProvider } from "@/hooks/useAuth";
import { useScrollReset } from "@/hooks/useScroll";

export default function Layout({ children }: { children: React.ReactNode }) {
  useScrollReset();
  const search = useSearchPopup();
  return (
    <AuthProvider>
      <ImageViewerProvider>
        <ProgressBar />
        <Navbar onSearch={() => search.open()} />
        <main id="swup">{children}</main>
        <Footer />
        <RightSideTools onSearch={() => search.open()} />
        <SearchPopup popup={search} />
        <AccountDock />
      </ImageViewerProvider>
    </AuthProvider>
  );
}
