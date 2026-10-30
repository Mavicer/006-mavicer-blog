import { HomeBackdrop } from "./HomeBackdrop";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RightSideTools } from "./RightSideTools";
import { SearchPopup, useSearchPopup } from "./SearchPopup";
import { ImageViewerProvider } from "./ImageViewer";
import { ProgressBar } from "./ProgressBar";
import { AuthProvider } from "@/hooks/useAuth";
import { useScrollReset } from "@/hooks/useScroll";
import { useState } from "react";
import { Personalization } from "./Personalization";

export default function Layout({ children }: { children: React.ReactNode }) {
  useScrollReset();
  const search = useSearchPopup();
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  return (
    <AuthProvider>
      <ImageViewerProvider>
        <HomeBackdrop />
        <ProgressBar />
        <Navbar onSearch={() => search.open()} />
        <main id="swup">{children}</main>
        <Footer />
        <RightSideTools onPersonalize={() => setPersonalizationOpen(true)} />
        <Personalization open={personalizationOpen} onClose={() => setPersonalizationOpen(false)} />
        <SearchPopup popup={search} />
      </ImageViewerProvider>
    </AuthProvider>
  );
}
