import { useState } from "react";
import { Link } from "react-router-dom";
import { usePosts } from "@/hooks/usePosts";
import type { Post } from "@/hooks/usePosts";

export type SearchPopupState = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

export function useSearchPopup(): SearchPopupState {
  const [isOpen, setOpen] = useState(false);
  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen,
  };
}

export function SearchPopup({ popup }: { popup: SearchPopupState }) {
  const [query, setQuery] = useState("");
  const { posts } = usePosts();

  const results: Post[] = query
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(query.toLowerCase()) ||
          p.body.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <div
      className={`search-pop-overlay ${popup.isOpen ? "active" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) popup.close();
      }}
    >
      <div className="search-popup">
        <div className="search-header flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="search-input-field-pre text-third-text">
            <i className="fa-solid fa-keyboard" />
          </span>
          <div className="search-input-container flex-1">
            <input
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="站内搜索您需要的内容..."
              spellCheck={false}
              type="search"
              className="search-input w-full bg-transparent outline-none text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && popup.close()}
            />
          </div>
          <button
            className="popup-btn-close text-third-text hover:text-primary"
            onClick={popup.close}
          >
            <i className="fa-solid fa-times" />
          </button>
        </div>
        <div id="search-result" className="max-h-[60vh] overflow-y-auto p-4">
          {query && results.length === 0 && (
            <div id="no-result" className="text-center py-6 text-third-text">
              没有找到相关文章。
            </div>
          )}
          {query && results.length > 0 && (
            <ul className="search-result-list list-none p-0 m-0 flex flex-col gap-2">
              {results.map((post) => (
                <li key={post.slug} className="py-2 border-b border-border last:border-0">
                  <Link
                    className="search-result-title block font-semibold hover:text-primary"
                    to={`/posts/${post.slug}`}
                    onClick={popup.close}
                  >
                    {post.title}
                  </Link>
                  <p className="search-result text-sm text-third-text mt-1">
                    {post.excerpt}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {!query && (
            <div className="text-center py-6 text-third-text text-sm">
              输入关键词开始搜索
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
