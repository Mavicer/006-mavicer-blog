import { useCallback, useEffect, useState } from "react";
import { feedbackLabels, feedbackToken, type FeedbackMessage } from "@/lib/feedback";
export function MyFeedback({ revision }: { revision: number }) {
  const [items,setItems] = useState<FeedbackMessage[]>([]);
  const [more,setMore] = useState(false);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState("");
  const load = useCallback(async (before?: number) => {
    setBusy(true); setError("");
    try {
      const token = feedbackToken();
      const response = await fetch(`/api/feedback${before ? `?before=${before}` : ""}`, { credentials:"omit",cache:"no-store",headers:{"X-Feedback-Token":token} });
      const data=await response.json(); if(!response.ok) throw new Error(data.detail || "读取失败，请稍后重试");
      setItems(old => before ? [...old,...data.items] : data.items); setMore(data.hasMore);
    } catch(error) { setError(error instanceof Error ? error.message : "无法读取留言记录"); }
    finally { setBusy(false); }
  },[]);
  useEffect(()=>{void load();},[load,revision]);
  return <section className="mt-8 border-t border-border pt-6"><h2 className="text-xl font-bold mb-3">我的留言</h2>
    <p className="text-sm text-third-text mb-4">只显示当前浏览器提交的留言。清除浏览器数据或更换设备后，无法找回匿名记录。旧版投稿没有查看凭证，暂不显示在这里。</p>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">正在读取…</p>}
    {!busy && !error && !items.length && <p className="text-third-text">你还没有提交过留言。</p>}
    <ul className="flex flex-col gap-4">{items.map(item=><li key={item.id} className="border border-border rounded-md p-4"><div className="flex justify-between gap-3 text-sm text-third-text mb-2"><span>{feedbackLabels[item.category]} · {item.read_at ? "博主已读" : "等待博主查看"}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("zh-CN")}</time></div><p className="whitespace-pre-wrap break-words">{item.body}</p></li>)}</ul>
    {more && <button className="mt-4 text-primary" disabled={busy} onClick={()=>void load(items[items.length-1]?.id)}>加载更早的留言</button>}
    {error && <button className="mt-3 text-primary" disabled={busy} onClick={()=>void load()}>重试</button>}
  </section>;
}
