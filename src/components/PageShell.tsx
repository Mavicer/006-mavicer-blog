import { motion } from "framer-motion";
import { Sidebar } from "@/sections/Sidebar";
import { usePosts } from "@/hooks/usePosts";

/**
 * PageShell — shared layout for non-home pages.
 * Uses a short, smooth fade-in (opacity only, no y-translate) so the
 * transition feels alive without the "double flash" that comes from
 * `mode="wait"` + y-displacement.
 */
export function PageShell({
  children,
  showSidebar = true,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
}) {
  usePosts();
  return (
    <div className="main-content-container flex flex-col min-h-dvh !pt-[100px]">
      <div className="main-content-header" />
      <motion.div
        className="main-content-body flex flex-row flex-wrap justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {showSidebar && <Sidebar />}
        <div className="main-content">
          <div className="home-content-container">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}

/** A card container matching .page-template-container / .article-content-container. */
export function PageCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`article-content-container mb-[30px] ${className}`}
    >
      {children}
    </div>
  );
}
