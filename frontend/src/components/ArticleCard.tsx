import { useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "@/hooks/usePosts";

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Mobile: how many tags to show before collapsing to "+N". */
const MOBILE_TAG_LIMIT = 3;

export function ArticleCard({ post }: { post: Post }) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const visibleTags = tagsExpanded
    ? post.tags
    : post.tags.slice(0, MOBILE_TAG_LIMIT);
  const hiddenCount = post.tags.length - visibleTags.length;

  return (
    <li className="home-article-item">
      <Link to={`/posts/${post.slug}`} className="flex flex-col gap-5 px-7 pb-7 pt-7 no-underline text-inherit">
        <h3 className="home-article-title">
          <span>{post.title}</span>
        </h3>

        <p className="home-article-content markdown-body">{post.excerpt}</p>

        <div className="home-article-meta-info-container">
          <div className="home-article-meta-info">
            <span className="meta-item whitespace-nowrap">
              <i className="fa-solid fa-calendar-days" />
              &nbsp;
              <span className="home-article-date">{formatDate(post.date)}</span>
            </span>
            <span className="home-article-category whitespace-nowrap">
              <i className="fa-solid fa-folder" />
              &nbsp;
              <span className={post.category === "经验分享" ? "font-semibold text-primary" : ""}>
                {post.category}
              </span>
            </span>
            {post.tags.length > 0 && (
              <span className="home-article-tag whitespace-nowrap">
                <i className="fa-solid fa-tag" />
                &nbsp;
                <span className="tag-list">
                  {visibleTags.map((tag, i) => (
                    <span key={tag} className="tag-item">
                      {i > 0 && <span className="tag-sep">|</span>}
                      {tag}
                    </span>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      className="tag-more cursor-pointer text-third-text hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setTagsExpanded(true);
                      }}
                    >
                      <span className="tag-sep">|</span>+{hiddenCount}
                    </button>
                  )}
                  {tagsExpanded && post.tags.length > MOBILE_TAG_LIMIT && (
                    <button
                      className="tag-more cursor-pointer text-third-text hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setTagsExpanded(false);
                      }}
                    >
                      <span className="tag-sep">|</span>收起
                    </button>
                  )}
                </span>
              </span>
            )}
          </div>
          <span className="whitespace-nowrap">
            阅读全文
            <span className="seo-reader-text sr-only">{post.title}</span>
            &nbsp;
            <i className="fa-solid fa-angle-right" />
          </span>
        </div>
      </Link>
    </li>
  );
}
