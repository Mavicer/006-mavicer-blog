import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePosts } from "@/hooks/usePosts";
import { seoFor, seoMarkup } from "../../shared/seo";

export function SeoMetadata() {
  const { pathname } = useLocation();
  const { posts } = usePosts();
  useLayoutEffect(() => {
    document.head.querySelectorAll("[data-seo]").forEach(node => node.remove());
    document.head.insertAdjacentHTML("beforeend", seoMarkup(seoFor(pathname, posts, location.hostname)));
  }, [pathname, posts]);
  return null;
}
