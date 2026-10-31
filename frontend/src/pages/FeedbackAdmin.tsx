import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useFeedbackNotifications } from "@/hooks/useFeedbackNotifications";
import { feedbackLabels, type FeedbackMessage } from "@/lib/feedback";
export default function FeedbackAdmin() {
  const [items,setItems] = useState<FeedbackMessage[]>([]);
  const [busy,setBusy] = useState(true);
  const [marking,setMarking] = useState(false);
  const [status,setStatus] = useState("");
  const [more,setMore] = useState(false);
  const { unread,refresh } = useFeedbackNotifications();
  const load=useCallback(async(before?:number)=>{
    setBusy(true);setStatus("");
    try{
      const response=await fetch(`/api/admin/feedback${before ? `?before=${before}` : ""}`,{cache:"no-store"});
      const data=await response.json();if(!response.ok)throw new Error(data.detail || "读取失败");
      setItems(old=>before ? [...old,...data.items] : data.items);setMore(data.hasMore);
    }catch(error){setStatus(error instanceof Error ? error.message : "读取失败");}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function markRead(ids:number[]){
    if(!ids.length || marking)return;setMarking(true);setStatus("");
    try{
      const response=await fetch("/api/admin/feedback/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
      const data=await response.json();if(!response.ok)throw new Error(data.detail || "标记失败");
      setItems(old=>old.map(item=>ids.includes(item.id)?{...item,read_at:new Date().toISOString()}:item));await refresh();
    }catch(error){setStatus(error instanceof Error ? error.message : "标记失败");}
    finally{setMarking(false);}
  }
  const visibleUnread=items.filter(item=>!item.read_at).slice(0,50).map(item=>item.id);
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[760px] mx-auto">
    <div className="flex justify-between gap-4 mb-4"><h1 className="text-3xl font-bold">意见收件箱</h1><button disabled={busy} onClick={()=>{void load();void refresh();}}>刷新</button></div>
    <p className="text-third-text mb-4">所有用户的匿名意见都会汇总在这里，仅博主可查看。{unread > 0 && <span className="text-primary"> {unread} 条未读</span>}</p>
    {!!visibleUnread.length && <button className="text-primary mb-5" disabled={marking} onClick={()=>void markRead(visibleUnread)}>将已加载的未读留言标为已读（最多 50 条）</button>}
    {status && <p role="alert">{status}</p>}
    {!busy && !status && !items.length && <p>暂时没有留言。</p>}
    <ul className="flex flex-col gap-4">{items.map(item=><li key={item.id} className="border border-border rounded-md p-4"><div className="flex justify-between flex-wrap gap-2 text-sm text-third-text mb-3"><span>{!item.read_at && <span className="text-red-500 mr-2">● 未读</span>}{feedbackLabels[item.category]}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})}</time></div><p className="whitespace-pre-wrap break-words">{item.body}</p>{!item.read_at && <button className="mt-3 text-sm text-primary" disabled={marking} onClick={()=>void markRead([item.id])}>标为已读</button>}</li>)}</ul>
    {busy && <p role="status">正在读取…</p>}
    {more && <button disabled={busy} className="mt-4 text-primary" onClick={()=>void load(items[items.length-1]?.id)}>加载更早的留言</button>}
    <Link to="/admin" className="block mt-6 text-primary">返回管理页</Link>
  </div></PageShell>;
}
