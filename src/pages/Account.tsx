import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";

export default function Account() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <PageShell showSidebar={false}>
        <div className="article-content-container max-w-[480px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2 text-first-text">账户</h1>
          <p className="text-third-text mb-6">
            这是博主管理入口。访客无需登录即可评论与点赞。
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="px-4 py-2 rounded-md bg-primary text-white font-semibold"
            >
              <i className="fa-regular fa-right-to-bracket" /> 登录
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
      </div>
    </PageShell>
  );
}
