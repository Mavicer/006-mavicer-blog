import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import type { Comment, Interaction } from "@/lib/api";

/** Reset article data and management drafts whenever the article or account changes. */
export function ArticleInteractions({ slug }: { slug: string }) {
  const { user } = useAuth();
  return <ArticleInteractionContent key={`${slug}:${user?.id}:${user?.is_owner}:${user?.must_change_password}`} slug={slug} />;
}

function ArticleInteractionContent({ slug }: { slug: string }) {
  const { user, loading, refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestVersion = useRef(0);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("正在连接在线互动");
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; body: string } | null>(null);
  const canManage = !!user && !loading && !user.must_change_password;

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const [inter, list] = await Promise.all([api.getInteractions(slug), api.listComments(slug)]);
      if (version !== requestVersion.current) return;
      setLoaded(true);
      setInteraction(inter);
      setComments(Array.isArray(list) ? list : []);
      setStatus("在线互动已连接");
    } catch (e: any) {
      if (version === requestVersion.current) setStatus(e?.message || "在线互动暂不可用");
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current++; };
  }, [refresh]);

  const handleFailure = async (e: any) => {
    const message = e?.message || "操作失败，请稍后再试";
    setFeedback(message);
    setActionError(message);
    if (e?.status === 401) await refreshAuth();
  };
  const requireLogin = () => {
    if (!user) { navigate(`/login?next=${encodeURIComponent(`/posts/${slug}`)}`); return false; }
    if (user.must_change_password) { navigate("/account"); return false; }
    return true;
  };
  const onLike = async () => {
    if (busy) return;
    setBusy(true); setFeedback("");
    try { setInteraction(await api.like(slug, !interaction?.liked)); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onFavorite = async () => {
    if (busy || !requireLogin()) return;
    setBusy(true); setFeedback("");
    try { setInteraction(await api.favorite(slug, !interaction?.favorited)); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onComment = async () => {
    if (!draft.trim() || busy || !requireLogin()) return;
    setBusy(true); setActionError("");
    try {
      const comment = await api.createComment(slug, draft.trim());
      ++requestVersion.current;
      setComments((list) => [comment, ...list]);
      setDraft(""); setFeedback("评论已发布");
    } catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onWithdraw = async () => {
    if (busy || confirmId === null || !requireLogin()) return;
    setBusy(true); setActionError("");
    try {
      await api.deleteComment(slug, confirmId);
      ++requestVersion.current;
      setComments((list) => list.filter((comment) => comment.id !== confirmId));
      setConfirmId(null); setFeedback("评论已撤回");
    } catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onSave = async () => {
    if (busy || !editing?.body.trim() || !requireLogin()) return;
    setBusy(true); setActionError("");
    try {
      const updated = await api.updateComment(slug, editing.id, editing.body.trim());
      ++requestVersion.current;
      setComments((list) => list.map((comment) => comment.id === updated.id ? updated : comment));
      setEditing(null); setFeedback("评论已更新");
    } catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };

  return (
    <section className="aleph-online">
      <div className="aleph-online__bar">
        <h2 className="aleph-online__title">评论</h2>
        <div className="aleph-online__actions">
          <button type="button" onClick={onLike} disabled={busy || !loaded} data-active={interaction?.liked ? "true" : "false"}>
            <i className="fa-regular fa-heart" /> 点赞 {interaction?.likes ?? 0}
          </button>
          <button type="button" onClick={onFavorite} disabled={busy || loading || !loaded} data-active={interaction?.favorited ? "true" : "false"}>
            <i className="fa-regular fa-bookmark" /> 收藏 {interaction?.favorites ?? 0}
          </button>
        </div>
      </div>
      <p className="aleph-online__status" role="status">
        {feedback || status} {status !== "在线互动已连接" && <button disabled={busy} onClick={() => { setFeedback(""); void refresh(); }}>重新连接</button>}
      </p>
      <div className="aleph-online__auth">
        <span className="aleph-online__user">{loading ? "正在确认账号…" : user ? `已登录：${user.display_name}` : "访客可以点赞，评论和收藏需登录"}</span>
      </div>
      <div className="aleph-online__comments">
        {!loaded ? <p>正在加载评论…</p> : comments.length === 0 ? (
          <p className="aleph-online__empty">暂无评论，来抢沙发吧</p>
        ) : comments.map((c) => (
          <div key={c.id} className={`aleph-online__comment${c.is_own ? " is-own" : ""}`}>
            <div className="aleph-online__comment-meta">
              <strong>{c.author_name}</strong>
              {c.is_own && <span className="aleph-online__own-tag">我</span>}
              <time dateTime={c.created_at}>{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</time>
              {c.updated_at && c.updated_at !== c.created_at && <span title={new Date(c.updated_at).toLocaleString()}>博主已编辑</span>}
              {editing?.id !== c.id && canManage && (c.is_own || user.is_owner) && (
                <div className="aleph-online__comment-tools">
                  {user.is_owner && <button type="button" className="aleph-online__icon-button" aria-label="编辑评论" title="编辑评论"
                    disabled={busy || editing !== null} onClick={() => { setEditing({ id: c.id, body: c.body }); setActionError(""); }}><Pencil size={15} aria-hidden="true" /></button>}
                  <button type="button" className="aleph-online__icon-button" aria-label="撤回评论" title="撤回评论"
                    disabled={busy || editing !== null} onClick={() => { setConfirmId(c.id); setActionError(""); }}><Trash2 size={15} aria-hidden="true" /></button>
                </div>
              )}
            </div>
            {editing?.id === c.id ? (
              <div className="aleph-online__editor">
                <label htmlFor={`comment-edit-${c.id}`}>编辑评论</label>
                <textarea id={`comment-edit-${c.id}`} value={editing.body} maxLength={3000} disabled={busy} autoFocus
                  onChange={(e) => setEditing({ id: c.id, body: e.target.value })} />
                {actionError && <p role="alert">{actionError}</p>}
                <div className="aleph-online__comment-actions">
                  <button type="button" className="aleph-online__icon-button" aria-label="取消编辑" title="取消编辑" disabled={busy}
                    onClick={() => { setEditing(null); setActionError(""); }}><X size={17} aria-hidden="true" /></button>
                  <button type="button" className="aleph-online__icon-button" aria-label="保存修改" title="保存修改"
                    disabled={busy || !editing.body.trim() || editing.body.trim() === c.body} onClick={onSave}>
                    {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            ) : <div className="aleph-online__comment-body">{c.body}</div>}
          </div>
        ))}
      </div>
      {user && !user.must_change_password ? <div className="aleph-online__composer">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000} disabled={busy}
          placeholder="写下评论（最多 3000 字）" aria-label="评论内容" className="w-full" />
        <button type="button" onClick={onComment} disabled={busy || loading || !loaded || !draft.trim()}>
          <i className="fa-regular fa-paper-plane" /> {busy ? "处理中…" : "发布评论"}
        </button>
      </div> : !loading && <p className="my-4">
        {user?.must_change_password ? <Link className="text-primary" to="/account">请先修改临时密码</Link> : <>
          <Link className="text-primary" to={`/login?next=${encodeURIComponent(`/posts/${slug}`)}`}>登录</Link>
          {" 或 "}<Link className="text-primary" to={`/register?next=${encodeURIComponent(`/posts/${slug}`)}`}>注册</Link>
          {" 后可以发表评论、收藏文章。"}
        </>}
      </p>}
      {confirmId !== null && <WithdrawDialog busy={busy} error={actionError} onCancel={() => setConfirmId(null)} onConfirm={onWithdraw} />}
    </section>
  );
}

function WithdrawDialog({ busy, error, onCancel, onConfirm }: {
  busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className="aleph-confirm-card" aria-labelledby="withdraw-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}>
      <p id="withdraw-title">确定撤回这条评论？撤回后无法恢复。</p>
      {error && <p role="alert">{error}</p>}
      <div className="aleph-confirm-actions">
        <button type="button" className="aleph-confirm-cancel" disabled={busy} onClick={onCancel} autoFocus>取消</button>
        <button type="button" className="aleph-confirm-ok" disabled={busy} onClick={onConfirm}>{busy ? "撤回中…" : "确认撤回"}</button>
      </div>
    </dialog>
  );
}
