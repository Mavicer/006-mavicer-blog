import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate(next.startsWith("/") ? next : "/account");
    } catch {
      setError("用户名或密码错误");
    }
  };

  return (
    <PageShell showSidebar={false}>
      <div className="article-content-container max-w-[480px] mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-first-text">登录账号</h1>
        <p className="text-third-text mb-6">登录后继续刚才的操作。</p>
        <form className="aleph-form flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">用户名</span>
            <input
              name="username"
              autoComplete="username"
              required
              minLength={2}
              maxLength={80}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            <span className="text-sm">密码</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={120}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <i className="fa-regular fa-right-to-bracket" /> 登录
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
