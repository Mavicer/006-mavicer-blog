import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
type Message = { id: number; category: string; body: string; created_at: string };
const labels: Record<string, string> = { bug: "报告 Bug", suggestion: "提出建议", other: "其他留言" };
export default function FeedbackAdmin() {
  const [items, setItems] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [more, setMore] = useState(false);
  const load = useCallback(async (before?: number) => {
    setBusy(true); setStatus("");
    try {
      const response = await fetch(`/api/admin/feedback${before ? `?before=${before}` : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setItems(old => before ? [...old, ...data.items] : data.items); setMore(data.hasMore);
    } catch (error) { setStatus(error instanceof Error ? error.message : "读取失败"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[760px] mx-auto">
    <div className="flex justify-between gap-4 mb-6"><h1 className="text-3xl font-bold">匿名留言</h1><button disabled={busy} onClick={() => void load()}>刷新</button></div>
    <p className="text-third-text mb-6">仅博主可查看。所有投稿均为匿名留言。</p>
    {status && <p role="alert">{status}</p>}
    {!busy && !status && !items.length && <p>暂时没有留言。</p>}
    <ul className="flex flex-col gap-4">{items.map(item => <li key={item.id} className="border border-border rounded-md p-4"><div className="flex justify-between flex-wrap gap-2 text-sm text-third-text mb-3"><span>{labels[item.category] || "留言"}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time></div><p className="whitespace-pre-wrap break-words">{item.body}</p></li>)}</ul>
    {busy && <p role="status">正在读取…</p>}
    {more && <button disabled={busy} className="mt-4 text-primary" onClick={() => void load(items[items.length - 1]?.id)}>加载更早的留言</button>}
    <Link to="/admin" className="block mt-6 text-primary">返回管理页</Link>
  </div></PageShell>;
}
