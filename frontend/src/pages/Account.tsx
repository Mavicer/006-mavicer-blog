import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import type { Post } from "@/hooks/usePosts";

export default function Account() {
  const { user, loading, error, logout, refresh } = useAuth();
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteRetry, setFavoriteRetry] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    let active = true;
    setFavorites([]);
    if (!user || user.must_change_password) return;
    setFavoritesLoading(true); setFavoriteError("");
    api.myFavorites().then((list) => { if (active) setFavorites(list); })
      .catch((e) => { if (active) setFavoriteError(e.message); })
      .finally(() => { if (active) setFavoritesLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.must_change_password, favoriteRetry]);
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setStatus("");
    if (newPassword !== confirm) { setStatus("两次输入的新密码不一致"); return; }
    setBusy(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setOldPassword(""); setNewPassword(""); setConfirm("");
      await refresh(); setStatus("密码已修改，所有设备已退出，请使用新密码重新登录。");
    } catch (e: any) { setStatus(e.message); } finally { setBusy(false); }
  };
  const inputClass = "px-3 py-2 rounded-md border border-border bg-background";
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[760px] mx-auto">
    <h1 className="text-3xl font-bold mb-4 text-first-text">我的账户</h1>
    {loading ? <p role="status">正在确认登录状态…</p> : !user ? <>
      <p className="mb-4 text-third-text">登录后可以评论、收藏，并在这里查看保存的文章。</p>
      <div className="flex gap-4 mb-4"><Link className="text-primary" to="/login">登录</Link><Link className="text-primary" to="/register">注册账号</Link></div>
      {error && <p role="alert">{error} <button onClick={() => void refresh()}>重试</button></p>}
    </> : <>
      <p className="mb-4">{user.display_name} <span className="text-third-text">@{user.username}</span></p>
      <div className="flex flex-wrap gap-4 mb-6">
        {user.is_owner && <><Link className="text-primary" to="/admin/users">账号管理</Link><Link className="text-primary" to="/admin">文章管理</Link></>}
        <button disabled={busy} onClick={async () => { setBusy(true); try { await logout(); } catch (e: any) { setStatus(e.message); } finally { setBusy(false); } }}>退出登录</button>
      </div>
      {user.must_change_password ? <p role="alert" className="mb-6 text-primary">你正在使用管理员提供的临时密码。请先修改密码，再进行评论或收藏。</p> : <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">我的收藏</h2>
        {favoritesLoading ? <p role="status">正在加载收藏…</p> : favoriteError ? <p role="alert">{favoriteError} <button onClick={() => setFavoriteRetry((value) => value + 1)}>重试</button></p> : favorites.length === 0 ? <p className="text-third-text">还没有收藏。阅读文章时点击“收藏”，就能在这里找到它。</p> : <ul className="flex flex-col gap-4">{favorites.map((post) => <li key={post.slug} className="border border-border rounded-md p-4">
          <Link className="text-lg font-bold text-primary" to={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link>
          <p className="text-sm text-third-text my-2">{post.excerpt}</p>
          <button disabled={busy} onClick={async () => { setBusy(true); try { await api.favorite(post.slug, false); setFavorites((list) => list.filter((p) => p.slug !== post.slug)); } catch (e: any) { setStatus(e.message); } finally { setBusy(false); } }}>取消收藏</button>
        </li>)}</ul>}
      </section>}
      <section><h2 className="text-xl font-bold mb-4">修改密码</h2>
        <form className="aleph-form flex flex-col gap-4 max-w-[480px]" onSubmit={changePassword}>
          <label className="flex flex-col gap-1">当前密码<input type="password" autoComplete="current-password" required minLength={12} maxLength={128} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1">新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1">确认新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} /></label>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50">修改密码并退出所有设备</button>
        </form>
      </section>
    </>}
    {status && <p role="status" className="mt-4 text-primary">{status}</p>}
  </div></PageShell>;
}
