import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { GitHubIcon } from "@/components/GitHubIcon";
import { profile } from "@/data/profile";
import { useRef } from "react";
import { site } from "@/config/site";
import { useTypedSubtitle } from "@/hooks/useTypedSubtitle";

export function HomeBanner() {
  const subRef = useRef<HTMLSpanElement>(null);
  useTypedSubtitle(subRef, [site.subtitle]);


  return (
    <>
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
        <div className="desktop-hero-actions">
          <Link to="/feedback" className="hero-action hero-action-feedback" aria-label="匿名留言板" title="匿名留言板"><MessageSquare size={20} aria-hidden="true" /></Link>
          <a href={profile.github.url} target="_blank" rel="noopener noreferrer" className="hero-action hero-action-github" aria-label="GitHub" title="GitHub"><GitHubIcon className="w-5 h-5" /></a>
        </div>
      </div>
    </>
  );
}
