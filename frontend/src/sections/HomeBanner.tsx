import { useRef } from "react";
import { site } from "@/config/site";
import { profile } from "@/data/profile";
import { useTypedSubtitle } from "@/hooks/useTypedSubtitle";
import { useTheme } from "@/hooks/useTheme";
import { useHomeBannerBlur } from "@/hooks/useScroll";

export function HomeBanner() {
  const subRef = useRef<HTMLSpanElement>(null);
  useTypedSubtitle(subRef, [site.subtitle]);
  const { effectiveMode } = useTheme();
  const blur = useHomeBannerBlur(15);

  const scrollToMain = () => {
    const target = document.querySelector(".main-content-container");
    target?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Full-screen background with parallax scale */}
      <div
        className="home-banner-background fixed top-0 left-0 w-screen h-screen scale-125 sm:scale-110 box-border will-change-transform bg-cover transition-fade"
        style={{
          backgroundImage: `url(/images/wallhaven-${
            effectiveMode === "dark" ? "wqery6-dark" : "wqery6-light"
          }.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
          filter: `blur(${blur}px)`,
          WebkitFilter: `blur(${blur}px)`,
        }}
      />
      <div className="home-banner-container flex justify-center items-center transition-fade relative z-[1]">
        {/* Centered hero text block — title + subtitle sit at the visual
            centre of the full-viewport hero, accounting for the navbar. */}
        <div className="content flex flex-col justify-center items-center transition-fade-down px-4">
          <div className="description flex flex-col justify-center items-center font-medium text-center">
            {site.name}
            <p>
              <i id="subtitle" ref={subRef} />
            </p>
          </div>
        </div>

        {/* Bottom-right GitHub pill — circular, transparent, minimal.
            Sits just above the main content section with comfortable spacing. */}
        <div className="home-banner-bottom-bar absolute bottom-4 right-8 sm:right-12 flex items-center">
          <a
            href={profile.github.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="group flex items-center justify-center w-12 h-12 rounded-full bg-gray-300/50 dark:bg-gray-500/40 backdrop-blur-lg border border-white/20 dark:border-gray-500/30 shadow-redefine-flat hover:shadow-redefine-flat-hover transition-all hover:scale-105"
          >
            <GitHubIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
          </a>
        </div>
      </div>
    </>
  );
}

/** Inline GitHub mark SVG — keeps the pill self-contained, no icon-font
 *  dependency that could render off-centre or with the wrong weight. */
function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.69.41.35.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.15 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}
