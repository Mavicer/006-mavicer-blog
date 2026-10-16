import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import type { Comment, Interaction } from "@/lib/api";

/** Visitor likes; account-owned favorites and comments. */
export function ArticleInteractions({ slug }: { slug: string }) {
  const { user, loading, refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestVersion = useRef(0);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("正在连接在线互动");
  const longPressTimer = useRef<number | null>(null);

  // Desktop: which comment's confirm dialog is open.
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // Mobile: floating delete button position.
  const [deleteMenu, setDeleteMenu] = useState<{
    commentId: number;
    x: number;
    y: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const [inter, list] = await Promise.all([
        api.getInteractions(slug),
        api.listComments(slug),
      ]);
      if (version !== requestVersion.current) return;
      setLoaded(true);
      setInteraction(inter);
      setComments(Array.isArray(list) ? list : []);
      setStatus("在线互动已连接");
    } catch (e: any) {
      if (version === requestVersion.current) setStatus(e?.message || "在线互动暂不可用");
    }
  }, [slug, user?.id]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current++; };
  }, [refresh]);

  const handleFailure = async (e: any) => {
    setStatus(e?.message || "操作失败，请稍后再试");
    if (e?.status === 401) await refreshAuth();
  };
  const requireLogin = () => {
    if (!user) { navigate(`/login?next=${encodeURIComponent(`/posts/${slug}`)}`); return false; }
    if (user.must_change_password) { navigate("/account"); return false; }
    return true;
  };
  const onLike = async () => {
    if (busy) return;
    setBusy(true);
    try { setInteraction(await api.like(slug, !interaction?.liked)); setStatus("在线互动已连接"); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onFavorite = async () => {
    if (busy || !requireLogin()) return;
    setBusy(true);
    try { setInteraction(await api.favorite(slug, !interaction?.favorited)); setStatus("在线互动已连接"); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onComment = async () => {
    if (!draft.trim() || busy || !requireLogin()) return;
    setBusy(true);
    try { await api.createComment(slug, draft.trim()); setDraft(""); await refresh(); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };
  const onDeleteComment = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try { await api.deleteComment(slug, id); await refresh(); }
    catch (e) { await handleFailure(e); } finally { setBusy(false); }
  };

  // ── Mobile long-press ──────────────────────────────────────────────
  const startLongPress = (id: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setDeleteMenu({ commentId: id, x, y });
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const confirmMobileDelete = async () => {
    if (!deleteMenu) return;
    await onDeleteComment(deleteMenu.commentId);
    setDeleteMenu(null);
  };

  // ── Desktop confirm ────────────────────────────────────────────────
  const handleDesktopDelete = async () => {
    if (confirmId === null) return;
    await onDeleteComment(confirmId);
    setConfirmId(null);
  };

  return (
    <section className="aleph-online">
      <div className="aleph-online__bar">
        <h2 className="aleph-online__title">评论</h2>
        <div className="aleph-online__actions">
          <button
            type="button"
            onClick={onLike}
            disabled={busy || !loaded}
            data-active={interaction?.liked ? "true" : "false"}
          >
            <i className="fa-regular fa-heart" /> 点赞 {interaction?.likes ?? 0}
          </button>
          <button
            type="button"
            onClick={onFavorite}
            disabled={busy || loading || !loaded}
            data-active={interaction?.favorited ? "true" : "false"}
          >
            <i className="fa-regular fa-bookmark" /> 收藏 {interaction?.favorites ?? 0}
          </button>
        </div>
      </div>

      <p className="aleph-online__status" role="status">{status} {status !== "在线互动已连接" && <button disabled={busy} onClick={() => void refresh()}>重新连接</button>}</p>

      <div className="aleph-online__auth">
        <span className="aleph-online__user">
          {loading ? "正在确认账号…" : user ? `已登录：${user.display_name}` : "访客可以点赞，评论和收藏需登录"}
        </span>
      </div>

      <div className="aleph-online__comments">
        {!loaded ? <p>正在加载评论…</p> : comments.length === 0 ? (
          <p className="aleph-online__empty">暂无评论，来抢沙发吧</p>
        ) : (
          comments.map((c) => {
            // Long-press handlers for own comments (mobile).
            const touchHandlers = c.is_own
              ? {
                  onTouchStart: (e: React.TouchEvent) => startLongPress(c.id, e),
                  onTouchEnd: cancelLongPress,
                  onTouchMove: cancelLongPress,
                }
              : {};
            return (
              <div
                key={c.id}
                className={`aleph-online__comment${c.is_own ? " is-own" : ""}`}
                {...touchHandlers}
              >
                <div className="aleph-online__comment-meta">
                  <strong>{c.author_name}</strong>
                  {c.is_own && <span className="aleph-online__own-tag">我</span>}
                  <time>{new Date(c.created_at).toLocaleString()}</time>
                </div>
                <div className="aleph-online__comment-body">{c.body}</div>
                {/* Desktop: small trash icon for own comments */}
                {c.is_own && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(c.id)}
                    className="aleph-online__del-icon"
                    aria-label="删除评论"
                  >
                    <i className="fa-regular fa-trash-can" />
                  </button>
                )}
                {/* Owner: delete button on all comments */}
                {user?.is_owner && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(c.id)}
                    className="aleph-online__del"
                  >
                    <i className="fa-regular fa-trash-can" /> 删除
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {user && !user.must_change_password ? <div className="aleph-online__composer">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000}
          placeholder="写下评论（最多 3000 字）" aria-label="评论内容" className="w-full" />
        <button type="button" onClick={onComment} disabled={busy || !draft.trim()}>
          <i className="fa-regular fa-paper-plane" /> {busy ? "处理中…" : "发布评论"}
        </button>
      </div> : !loading && <p className="my-4">
        {user?.must_change_password ? <Link className="text-primary" to="/account">请先修改临时密码</Link> : <>
          <Link className="text-primary" to={`/login?next=${encodeURIComponent(`/posts/${slug}`)}`}>登录</Link>
          {" 或 "}<Link className="text-primary" to={`/register?next=${encodeURIComponent(`/posts/${slug}`)}`}>注册</Link>
          {" 后可以发表评论、收藏文章。"}
        </>}
      </p>}

      {/* ── Desktop: custom confirm dialog ── */}
      {confirmId !== null && (
        <div
          className="aleph-confirm-overlay"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="aleph-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p>确定删除这条评论？</p>
            <div className="aleph-confirm-actions">
              <button
                type="button"
                className="aleph-confirm-cancel"
                onClick={() => setConfirmId(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="aleph-confirm-ok"
                disabled={busy}
                onClick={handleDesktopDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: floating delete button at finger position ── */}
      {deleteMenu && (
        <>
          <div
            className="aleph-online__menu-backdrop"
            onClick={() => setDeleteMenu(null)}
          />
          <button
            type="button"
            className="aleph-online__menu-btn"
            style={{ left: deleteMenu.x, top: deleteMenu.y }}
            onClick={confirmMobileDelete}
          >
            <i className="fa-regular fa-trash-can" /> 删除
          </button>
        </>
      )}
    </section>
  );
}
