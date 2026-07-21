import { useCallback, useEffect, useRef, useState } from "react";
import LoginLink from "./LoginLink";

interface ThreadMessage {
  id: string;
  text: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string | null;
  edited: boolean;
  mine: boolean;
}

interface ThreadData {
  title: string;
  messages: ThreadMessage[];
  nextCursor: string | null;
  me: { name: string } | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ThreadPopup({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingMoreRef = useRef(false);

  const load = useCallback(() => {
    fetch("/api/thread")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setFailed(true);
        else setData(d);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return;
    setData((current) => {
      if (!current?.nextCursor) return current;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      fetch(`/api/thread?cursor=${encodeURIComponent(current.nextCursor)}`)
        .then((r) => r.json())
        .then((page: ThreadData & { error?: string }) => {
          if (page?.error) return;
          setData((prev) => {
            if (!prev) return prev;
            const seen = new Set(prev.messages.map((m) => m.id));
            return {
              ...prev,
              messages: [
                ...prev.messages,
                ...page.messages.filter((m) => !seen.has(m.id)),
              ],
              nextCursor: page.nextCursor,
            };
          });
        })
        .catch(() => {})
        .finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      return current;
    });
  }, []);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) {
        window.location.href = "/api/auth/login?returnUrl=/";
        return;
      }
      if (!res.ok) throw new Error("post failed");
      const body = await res.json().catch(() => null);
      setDraft("");
      if (body?.message) {
        // Show the new message immediately — the comments listing is
        // eventually consistent and a refetch may not include it yet.
        setData((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  body.message,
                  ...prev.messages.filter((m) => m.id !== body.message.id),
                ],
              }
            : prev,
        );
      } else {
        load();
      }
    } catch {
      setPostError("Couldn't post your message — try again.");
    } finally {
      setPosting(false);
    }
  }, [draft, posting, load]);

  return (
    <div className="thread-backdrop" onClick={onClose}>
      <div
        className="thread-popup"
        role="dialog"
        aria-label="What do you think of AI music?"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="thread-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>What do you think of AI music?</h2>
        <p className="thread-sub">
          One thread, everyone's take — newest first.
        </p>

        {data?.me ? (
          <div className="thread-composer">
            <textarea
              ref={textareaRef}
              value={draft}
              maxLength={2000}
              placeholder="Share your thoughts…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
            <div className="thread-composer-row">
              {postError && <span className="thread-error">{postError}</span>}
              <button
                className="thread-post"
                disabled={posting || draft.trim().length === 0}
                onClick={submit}
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        ) : (
          <LoginLink
            className="thread-login-cta"
            label="Log in to join the conversation"
          />
        )}

        <div
          className="thread-messages"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
              loadMore();
            }
          }}
        >
          {failed && <p className="thread-empty">The thread failed to load. Try again later.</p>}
          {!failed && !data && <p className="thread-empty">Loading the conversation…</p>}
          {data && data.messages.length === 0 && (
            <p className="thread-empty">No thoughts yet — be the first.</p>
          )}
          {data?.messages.map((m) => (
            <div className={`thread-msg ${m.mine ? "mine" : ""}`} key={m.id}>
              <div className="thread-msg-head">
                {m.authorAvatar ? (
                  <img src={m.authorAvatar} alt="" />
                ) : (
                  <span className="thread-avatar-fallback">
                    {m.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <strong>{m.authorName}</strong>
                <span className="thread-time">
                  {timeAgo(m.createdAt)}
                  {m.edited ? " · edited" : ""}
                </span>
              </div>
              <p>{m.text}</p>
            </div>
          ))}
          {loadingMore && <p className="thread-empty">Loading more…</p>}
          {data && !data.nextCursor && data.messages.length > 20 && (
            <p className="thread-empty">That's everyone's take so far.</p>
          )}
        </div>
      </div>
    </div>
  );
}
