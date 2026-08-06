/**
 * Server-side read of the current Wix member (impure Wix adapter). Returns a normalized
 * `MemberInfo` or `null` for anonymous visitors — the pure capability model lives in
 * `../members/capability`.
 *
 * Login/logout need NO code here: Wix's Astro integration provides built-in `/api/auth/login`
 * and `/api/auth/logout` endpoints (see the account page + `<LockedFeature>`).
 *
 * Member identity is resolved in two ways, because `members.getCurrentMember()` is unreliable in
 * some contexts (notably POST API routes, where it returns nothing even though the request carries a
 * member session): (1) the Members-API profile read (gives name/email/avatar), and (2) the member id
 * decoded from the session access token (`getContextualAuth().getTokens()`), which is present
 * whenever `loggedIn()` is true. `getMemberId()` prefers (1) and falls back to (2) so member writes
 * (avatars, likes) get a stable id even when the profile read fails.
 */

import { getContextualAuth } from "@wix/sdk-runtime/context";
import { members } from "@wix/members";
import type { MemberInfo } from "../members/capability";

type ContextualAuth = { loggedIn?: () => boolean; getTokens?: () => { accessToken?: { value?: string } } };

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return atob(b64);
}

/** Decode the member id from the session access token (works even when getCurrentMember fails). */
export function memberIdFromToken(): string | null {
  try {
    const value = (getContextualAuth() as ContextualAuth).getTokens?.().accessToken?.value;
    if (!value) return null;
    const parts = value.split("."); // JWT-ish: […, header, PAYLOAD, signature]
    const payloadSeg = parts[parts.length - 2];
    if (!payloadSeg) return null;
    const outer = JSON.parse(base64UrlDecode(payloadSeg)) as { data?: unknown };
    const data = (typeof outer.data === "string" ? JSON.parse(outer.data) : outer.data) as {
      instance?: { siteMemberId?: string; memberId?: string; uid?: string };
    };
    const inst = data?.instance ?? {};
    const id = inst.siteMemberId ?? inst.memberId ?? inst.uid ?? null;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function loggedIn(): boolean {
  try {
    return (getContextualAuth() as ContextualAuth).loggedIn?.() === true;
  } catch {
    return false;
  }
}

/**
 * The current member's id, or null if not signed in. Prefers the Members-API read; falls back to the
 * session-token id. This is the authoritative id for trusted member writes (`/api/avatar`, likes).
 */
export async function getMemberId(): Promise<string | null> {
  try {
    const id = (await members.getCurrentMember())?.member?._id;
    if (id) return id;
  } catch {
    /* fall through to the token */
  }
  return loggedIn() ? memberIdFromToken() : null;
}

export async function getSessionMember(): Promise<MemberInfo | null> {
  // Signal 1 — profile read. If it returns a member, we're logged in (and get name/email/avatar).
  try {
    const { member: m } = await members.getCurrentMember();
    if (m?._id) {
      return {
        id: m._id,
        name: m.profile?.nickname ?? m.profile?.slug ?? m.loginEmail ?? "Player",
        email: m.loginEmail ?? null,
        avatarUrl: m.profile?.photo?.url ?? null,
      };
    }
  } catch {
    /* profile read can fail on scope/profile even when logged in — fall through to the session check */
  }

  // Signal 2 — logged in per the session token, but the profile read failed. Use the token's member
  // id so reads (account/arena SSR) and writes (/api/avatar) key on the SAME id.
  if (loggedIn()) return { id: memberIdFromToken() ?? "member", name: "Player", email: null, avatarUrl: null };
  return null; // visitor
}
