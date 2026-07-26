import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import type { Comment, Interaction } from "@/lib/api";

/**
 * ArticleInteractions — the comments / like / favorite block mounted below
 * article bodies. Mirrors the original site's .aleph-online widget.
 */
export function ArticleInteractions({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("正在连接在线互动");

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
    if (!user) {
      window.location.hash = `/login`;
      return;
    }
    if (interaction?.liked) {
      setInteraction(await api.unlike(slug));
    } else {
      setInteraction(await api.like(slug));
    }
  };

  const onFavorite = async () => {
    if (!user) {
      window.location.hash = `/login`;
      return;
    }
    if (interaction?.favorited) {
      setInteraction(await api.unfavorite(slug));
    } else {
      setInteraction(await api.favorite(slug));
    }
  };

  const onComment = async () => {
    if (!user || !draft.trim()) return;
    try {
      await api.createComment(slug, draft.trim());
      setDraft("");
      refresh();
    } catch {
      setStatus("评论发布失败");
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
          {user ? user.display_name || user.username : "访客模式"}
        </span>
      </div>

      <div className="aleph-online__comments">
        {comments.length === 0 ? (
          <p className="aleph-online__empty">暂无评论</p>
        ) : (
          comments.map((c) => {
            const canDelete =
              user && (user.is_owner || user.id === c.user.id);
            return (
              <div key={c.id} className="aleph-online__comment">
                <div className="aleph-online__comment-meta">
                  <strong>{c.user.display_name}</strong>
                  <time>{new Date(c.created_at).toLocaleString()}</time>
                </div>
                <div className="aleph-online__comment-body">{c.body}</div>
                {canDelete && (
                  <button type="button" onClick={() => onDeleteComment(c.id)}>
                    <i className="fa-regular fa-trash-can" /> 删除
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="aleph-online__composer">
        {user ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写下评论"
              className="w-full"
            />
            <button type="button" onClick={onComment}>
              <i className="fa-regular fa-paper-plane" /> 发布评论
            </button>
          </>
        ) : (
          <p className="aleph-online__empty">
            <a href="#/login" className="text-primary hover:underline">
              登录
            </a>
            后可以发布评论、点赞和收藏。
          </p>
        )}
      </div>
    </section>
  );
}
