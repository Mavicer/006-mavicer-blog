import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";

export default function Login({ registering = false }: { registering?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const value = params.get("next") || "/account";
  const next = value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/account";
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (registering && password !== confirm) { setError("两次输入的密码不一致"); return; }
    try {
      if (registering) await auth.register(username, password, displayName || username);
      else await auth.login(username, password);
      setPassword(""); setConfirm("");
      navigate(api.currentUser()?.must_change_password ? "/account" : next);
    } catch (e: any) { setError(e?.message || "暂时无法完成操作，请重试"); }
  };
  const inputClass = "px-3 py-2 rounded-md border border-border bg-background";
  return <PageShell showSidebar={false}>
    <div className="article-content-container max-w-[480px] mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-first-text">{registering ? "注册账号" : "登录账号"}</h1>
      <p className="text-third-text mb-6">登录后可以评论、收藏，并在不同设备查看自己的收藏。</p>
      <form className="aleph-form flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1"><span>用户名</span><input name="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} /></label>
        {registering && <><p className="text-sm text-third-text">3–30 个字母、数字或下划线，不区分大小写。</p><label className="flex flex-col gap-1"><span>昵称（公开显示）</span><input name="display_name" autoComplete="nickname" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} /></label></>}
        <label className="flex flex-col gap-1"><span>密码</span><input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} /></label>
        {registering && <label className="flex flex-col gap-1"><span>再次输入密码</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} /></label>}
        <p className="text-sm text-third-text">密码至少 12 个字符。忘记密码时请联系博主协助重置。</p>
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <button type="submit" disabled={auth.loading} className="px-4 py-2 rounded-md bg-primary text-white font-semibold disabled:opacity-50">{auth.loading ? "处理中…" : registering ? "注册并登录" : "登录"}</button>
        <Link className="text-primary" to={`${registering ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}>{registering ? "已有账号？去登录" : "还没有账号？去注册"}</Link>
      </form>
    </div>
  </PageShell>;
}
