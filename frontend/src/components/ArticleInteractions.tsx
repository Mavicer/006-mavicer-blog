import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import type { Comment, Interaction } from "@/lib/api";

/**
 * ArticleInteractions — the comments / like / favorite block mounted below
 * article bodies. Mirrors the original site's .aleph-online widget.
 *
 * Anonymous-first: any visitor can like, favorite, and comment without
 * logging in. A nickname field defaults to "访客". Interactions are keyed
 * by a stable browser client_id (UX only). Visitors can long-press (or
 * right-click) their OWN comments to delete them; the owner sees a delete
 * button on every comment.
 */
export function ArticleInteractions({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [nick, setNick] = useState("");
  const [status, setStatus] = useState("正在连接在线互动");
  const longPressTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [inter, list] = await Promise.all([
        api.getInteractions(slug),
        api.listComments(slug),
      ]);
      setInteraction(inter);
      setComments(list);
      setStatus("在线互动已连接");
    } catch {
      setStatus("在线互动暂不可用");
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onLike = async () => {
    try {
      setInteraction(await api.like(slug));
    } catch {
      setStatus("操作失败，请稍后再试");
    }
  };

  const onFavorite = async () => {
    try {
      setInteraction(await api.favorite(slug));
    } catch {
      setStatus("操作失败，请稍后再试");
    }
  };

  const onComment = async () => {
    if (!draft.trim()) return;
    try {
      await api.createComment(slug, draft.trim(), nick.trim() || undefined);
      setDraft("");
      refresh();
    } catch (e: any) {
      setStatus(e?.message || "评论发布失败");
    }
  };

  const onDeleteComment = async (id: number) => {
    try {
      await api.deleteComment(slug, id);
      refresh();
    } catch {
      setStatus("删除失败");
    }
  };

  // Long-press (mobile) / context menu (desktop) to delete your own comment.
  const startLongPress = (id: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      if (window.confirm("删除这条评论？")) onDeleteComment(id);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  // Prevent the browser's native context menu so our confirm dialog is the
  // only action on right-click for own comments.
  const onOwnContextMenu = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (window.confirm("删除这条评论？")) onDeleteComment(id);
  };

  return (
    <section className="aleph-online">
      <div className="aleph-online__bar">
        <h2 className="aleph-online__title">评论</h2>
        <div className="aleph-online__actions">
          <button
            type="button"
            onClick={onLike}
            data-active={interaction?.liked ? "true" : "false"}
          >
            <i className="fa-regular fa-heart" /> 点赞 {interaction?.likes ?? 0}
          </button>
          <button
            type="button"
            onClick={onFavorite}
            data-active={interaction?.favorited ? "true" : "false"}
          >
            <i className="fa-regular fa-bookmark" /> 收藏 {interaction?.favorites ?? 0}
          </button>
        </div>
      </div>

      <p className="aleph-online__status">{status}</p>

      <div className="aleph-online__auth">
        <span className="aleph-online__user">
          {user?.is_owner ? "管理员模式" : "访客模式"}
        </span>
      </div>

      <div className="aleph-online__comments">
        {comments.length === 0 ? (
          <p className="aleph-online__empty">暂无评论，来抢沙发吧</p>
        ) : (
          comments.map((c) => {
            const canDelete = c.is_own || user?.is_owner;
            const longPressHandlers = c.is_own
              ? {
                  onTouchStart: () => startLongPress(c.id),
                  onTouchEnd: cancelLongPress,
                  onTouchMove: cancelLongPress,
                  onContextMenu: (e: React.MouseEvent) =>
                    onOwnContextMenu(e, c.id),
                }
              : {};
            return (
              <div
                key={c.id}
                className={`aleph-online__comment${c.is_own ? " is-own" : ""}`}
                {...longPressHandlers}
              >
                <div className="aleph-online__comment-meta">
                  <strong>{c.author_name}</strong>
                  {c.is_own && <span className="aleph-online__own-tag">我</span>}
                  <time>{new Date(c.created_at).toLocaleString()}</time>
                  {user?.is_owner && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c.id)}
                      className="aleph-online__del"
                    >
                      <i className="fa-regular fa-trash-can" /> 删除
                    </button>
                  )}
                </div>
                <div className="aleph-online__comment-body">{c.body}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="aleph-online__composer">
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="昵称（可选，默认访客）"
          maxLength={60}
          className="aleph-online__nick w-full"
        />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="写下评论"
          className="w-full"
        />
        <button type="button" onClick={onComment} disabled={!draft.trim()}>
          <i className="fa-regular fa-paper-plane" /> 发布评论
        </button>
      </div>
    </section>
  );
}
