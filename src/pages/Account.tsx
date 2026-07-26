import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { listArticles } from "@/services/articlesService";
import type { Post } from "@/hooks/usePosts";

export default function Account() {
  const { user, logout } = useAuth();
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Mock: no favorites store yet; surface CMS articles authored locally.
    setFavorites(listArticles());
    setLoading(false);
  }, [user]);

  if (!user) {
    return (
      <PageShell showSidebar={false}>
        <div className="article-content-container max-w-[480px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2 text-first-text">账户</h1>
          <p className="text-third-text mb-6">
            登录后可以评论、点赞、收藏文章，并在这里查看收藏列表。
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-4 py-2 rounded-md bg-primary text-white font-semibold"
            >
              <i className="fa-regular fa-right-to-bracket" /> 登录
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-md border border-border font-semibold"
            >
              <i className="fa-regular fa-user-plus" /> 注册
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showSidebar={false}>
      <div className="article-content-container max-w-[760px] mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-first-text">账户</h1>
        <p className="text-third-text mb-6">{user.display_name || user.username}</p>

        <div className="flex gap-3 mb-8">
          {user.is_owner && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-md border border-border font-semibold hover:text-primary"
            >
              <i className="fa-regular fa-pen-to-square" /> 管理后台
            </Link>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-md border border-border font-semibold hover:text-primary"
          >
            <i className="fa-regular fa-right-from-bracket" /> 退出登录
          </button>
        </div>

        <h2 className="text-xl font-bold mb-4 text-first-text">我的收藏</h2>
        {loading ? (
          <p className="text-third-text">加载中...</p>
        ) : favorites.length === 0 ? (
          <p className="text-third-text">
            还没有收藏文章。打开任意文章，在评论区上方点击「收藏」即可加入这里。
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {favorites.map((p) => (
              <article key={p.slug} className="p-4 rounded-redefine-small shadow-redefine-flat">
                <Link to={`/posts/${p.slug}`} className="font-semibold hover:text-primary">
                  {p.title}
                </Link>
                <p className="text-sm text-third-text mt-1">{p.excerpt}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
