import type { APIRoute } from "astro";
import { comments } from "@wix/comments";
import { members } from "@wix/members";
import { auth } from "@wix/essentials";
import {
  BLOG_APP_ID,
  getThreadReference,
  plainTextToRicos,
  ricosToPlainText,
} from "../../server/thread";

interface ThreadMessage {
  id: string;
  text: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string | null;
  edited: boolean;
  mine: boolean;
}

const authorCache = new Map<string, { name: string; avatar: string | null }>();

async function resolveAuthor(memberId: string | undefined) {
  if (!memberId) return { name: "Anonymous", avatar: null };
  const cached = authorCache.get(memberId);
  if (cached) return cached;
  try {
    // Reading OTHER members' profiles is denied to visitor/member callers —
    // elevate the lookup; only public profile fields (nickname, photo) are
    // exposed to the client.
    const elevatedGetMember = auth.elevate(members.getMember);
    const result: any = await elevatedGetMember(memberId, {
      fieldsets: ["PUBLIC"] as any,
    });
    const member = result?.member ?? result;
    const resolved = {
      name: member?.profile?.nickname || member?.profile?.name || "Member",
      avatar: member?.profile?.photo?.url ?? null,
    };
    authorCache.set(memberId, resolved);
    return resolved;
  } catch {
    return { name: "Member", avatar: null };
  }
}

async function getCurrentMemberSafe() {
  try {
    const { member } = await members.getCurrentMember({
      fieldsets: ["FULL"] as any,
    });
    return member ?? null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const cursor = url.searchParams.get("cursor");
    const [reference, me] = await Promise.all([
      getThreadReference(),
      getCurrentMemberSafe(),
    ]);
    const result = await comments.listCommentsByResource(BLOG_APP_ID, {
      contextId: reference.referenceId,
      resourceId: reference.referenceId,
      commentSort: { order: "NEWEST_FIRST" as any },
      cursorPaging: cursor ? { limit: 20, cursor } : { limit: 20 },
    });
    const items: ThreadMessage[] = await Promise.all(
      (result.comments ?? []).map(async (comment: any) => {
        const author = await resolveAuthor(comment.author?.memberId);
        return {
          id: comment._id,
          text: ricosToPlainText(comment.content?.richContent),
          authorName: author.name,
          authorAvatar: author.avatar,
          createdAt: comment._createdDate
            ? new Date(comment._createdDate).toISOString()
            : null,
          edited: comment.contentEdited === true,
          mine: !!me && comment.author?.memberId === me._id,
        };
      }),
    );
    const paging: any = (result as any).pagingMetadata;
    const nextCursor =
      paging?.hasNext && paging?.cursors?.next ? paging.cursors.next : null;
    return new Response(
      JSON.stringify({
        title: reference.title,
        messages: items,
        nextCursor,
        me: me
          ? { name: me.profile?.nickname || me.loginEmail || "Member" }
          : null,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const me = await getCurrentMemberSafe();
  if (!me) {
    return new Response(JSON.stringify({ error: "login-required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  let text = "";
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    /* fall through to the empty-text check */
  }
  if (!text || text.length > 2000) {
    return new Response(JSON.stringify({ error: "bad-text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const reference = await getThreadReference();
    const created: any = await comments.createComment({
      appId: BLOG_APP_ID,
      contextId: reference.referenceId,
      resourceId: reference.referenceId,
      content: { richContent: plainTextToRicos(text) as any },
    });
    const comment = created?.comment ?? created;
    // Return the created message so the client can show it immediately —
    // the comments listing is eventually consistent and may lag a refetch.
    const message: ThreadMessage = {
      id: comment?._id ?? `local-${Date.now()}`,
      text,
      authorName: me.profile?.nickname || me.loginEmail || "Member",
      authorAvatar: me.profile?.photo?.url ?? null,
      createdAt: new Date().toISOString(),
      edited: false,
      mine: true,
    };
    return new Response(JSON.stringify({ ok: true, message }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
