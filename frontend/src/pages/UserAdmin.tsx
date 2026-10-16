import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import * as api from "@/lib/api";

export default function UserAdmin() {
  const [users, setUsers] = useState<api.User[]>([]);
  const [password, setPassword] = useState("");
  const [temporary, setTemporary] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.listUsers().then(setUsers).catch((e) => setStatus(e.message)); }, []);
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[760px] mx-auto">
    <h1 className="text-3xl font-bold mb-4">账号管理</h1>
    <p className="mb-4 text-third-text">为用户重置密码会退出其所有设备。临时密码只显示一次，用户登录后必须修改。</p>
    <label className="flex flex-col gap-2 mb-4">验证管理员密码<input type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background" /></label>
    {status && <p role="status" className="my-4">{status}</p>}
    {temporary && <div role="status" className="border border-border rounded-md p-4 my-4"><p>临时密码：<code>{temporary}</code></p><button onClick={() => setTemporary("")}>隐藏</button></div>}
    <ul className="flex flex-col gap-4">{users.map((user) => <li key={user.id} className="flex flex-wrap gap-4 items-center border border-border rounded-md p-4">
      <span>{user.display_name}（@{user.username}）{user.is_owner ? " · 管理员" : ""}</span>
      {!user.is_owner && <button disabled={busy || !password} onClick={async () => {
        if (!window.confirm(`重置 @${user.username} 的密码并退出其所有设备？`)) return;
        setBusy(true); setTemporary(""); setStatus("");
        try { const result = await api.resetUserPassword(user.id, password); setTemporary(result.temporary_password); setStatus(`@${user.username} 的密码已重置，请通过可信渠道交给本人。`); }
        catch (e: any) { setStatus(e.message); } finally { setBusy(false); setPassword(""); }
      }}>重置密码</button>}
    </li>)}</ul>
  </div></PageShell>;
}
