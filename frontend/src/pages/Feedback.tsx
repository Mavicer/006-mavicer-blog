import { useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MyFeedback } from "@/components/MyFeedback";
import { feedbackToken } from "@/lib/feedback";
import { Link } from "react-router-dom";
import { FeedbackTypePicker } from "@/components/FeedbackTypePicker";
import { PageShell } from "@/components/PageShell";

export default function Feedback() {
  const { user, loading } = useAuth();
  if (loading) return <PageShell showSidebar={false}><p role="status">正在读取…</p></PageShell>;
  if (user?.is_owner) return <Navigate to="/admin/feedback" replace />;
  return <VisitorFeedback />;
}
function VisitorFeedback() {
  const [category, setCategory] = useState("bug");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [revision, setRevision] = useState(0);
  const key = useRef(crypto.randomUUID());
  const locked = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, body, submission_key: key.current, receipt_token: feedbackToken() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "提交失败，请稍后重试");
      setSent(true); setRevision(value => value + 1); setBody(""); setStatus("留言已送达，谢谢你的反馈。");
    } catch (error) { setStatus(error instanceof Error ? error.message : "提交失败，请稍后重试"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <PageShell showSidebar={false}><div className="article-content-container max-w-[680px] mx-auto">
    <h1 className="text-3xl font-bold mb-4">匿名留言板</h1>
    <p className="text-third-text mb-6">发现 Bug、有建议，或有什么想告诉我，都可以写在这里。无需登录，内容仅你和博主可见。</p>
    {!sent && <form onSubmit={submit} className="flex flex-col gap-4">
      <FeedbackTypePicker value={category} onChange={setCategory} disabled={busy} />
      <label className="flex flex-col gap-2">留言内容<textarea required maxLength={2000} rows={8} value={body} disabled={busy} onChange={e => setBody(e.target.value)} placeholder="如果是 Bug，可以写下出现问题的页面、操作步骤和设备情况。" className="p-3 border border-border rounded-md bg-background resize-y" /></label>
      <span className="text-sm text-third-text">{body.length} / 2000</span>
      <button type="submit" disabled={busy || !body.trim()} className="self-start px-5 py-2 rounded-md bg-primary text-white disabled:opacity-50">{busy ? "正在提交…" : "匿名提交"}</button>
    </form>}
    {status && <p role="status" className="my-4">{status}</p>}
    {sent && <button className="text-primary mr-6" onClick={() => { key.current = crypto.randomUUID(); setSent(false); setStatus(""); }}>再写一条</button>}
    <MyFeedback revision={revision} />
    <Link to="/" className="inline-block mt-6 text-primary">返回首页</Link>
  </div></PageShell>;
}
