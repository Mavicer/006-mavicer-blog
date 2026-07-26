import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register({
        username,
        email,
        password,
        display_name: displayName || undefined,
        owner_key: ownerKey || undefined,
      });
      navigate("/account");
    } catch (err: any) {
      setError(err?.status === 409 ? "用户名或邮箱已存在。" : "注册失败，请检查输入。");
    }
  };

  return (
    <PageShell showSidebar={false}>
      <div className="article-content-container max-w-[480px] mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-first-text">注册账号</h1>
        <p className="text-third-text mb-6">创建账号后可以评论、点赞和收藏。</p>
        <form className="aleph-form flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">用户名</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">邮箱</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">显示名</span>
            <input
              maxLength={120}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">密码</span>
            <input
              type="password"
              required
              minLength={8}
              maxLength={120}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">Owner Key（可选，填对即成为管理员）</span>
            <input
              type="password"
              maxLength={120}
              value={ownerKey}
              onChange={(e) => setOwnerKey(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          {error && <p className="text-sm text-primary">{error}</p>}
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
              disabled={loading}
            >
              <i className="fa-regular fa-user-plus" /> 注册
            </button>
            <a href="#/login" className="text-third-text hover:text-primary text-sm">
              已有账号，去登录
            </a>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
