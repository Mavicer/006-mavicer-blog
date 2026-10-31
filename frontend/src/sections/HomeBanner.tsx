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


      </div>
    </>
  );
}
