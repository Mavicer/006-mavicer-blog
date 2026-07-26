import { motion } from "framer-motion";
import { Sidebar } from "@/sections/Sidebar";
import { usePosts } from "@/hooks/usePosts";

/**
 * PageShell — shared layout for non-home pages: navbar-pushed content with
 * the left sidebar, matching Redefine's content pages.
 */
export function PageShell({
  children,
  showSidebar = true,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
}) {
  usePosts(); // ensure taxonomy is warmed for sidebar counts
  return (
    <div className="main-content-container flex flex-col justify-between min-h-dvh !pt-[140px]">
      <div className="main-content-header" />
      <motion.div
        className="main-content-body transition-fade-up flex flex-row flex-wrap justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
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
