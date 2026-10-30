import { Sidebar } from "@/sections/Sidebar";
import { usePosts } from "@/hooks/usePosts";

// Shared page layout stays fully visible during route changes.
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
      <div
        className="main-content-body flex flex-row flex-wrap justify-center"
      >
        {showSidebar && <Sidebar />}
        <div className="main-content">
          <div className="home-content-container">{children}</div>
        </div>
      </div>
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
