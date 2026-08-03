import type { AstroCookies } from "astro";
import { members as wixMembers } from "@wix/members";
import { items } from "@wix/data";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { WIX_CLIENT_ID } from "astro:env/client";

type WixSessionCookie = {
  clientId?: string;
  tokens?: {
    accessToken?: {
      expiresAt?: number;
      value?: string;
    };
    refreshToken?: {
      role?: string;
      value?: string;
    };
  };
};

const MEMBER_ROLE = "member";
const ALLOWED_MEMBER_EMAIL_DOMAIN = "@wix.com";
const FEEDBACK_COLLECTION_ID = "TrendReportFeedback";

export function hasMemberSession(cookies: AstroCookies) {
  const session = getWixSessionCookie(cookies);
  return session?.tokens?.refreshToken?.role === MEMBER_ROLE;
}

export function getWixSessionCookie(cookies: AstroCookies) {
  return cookies.get("wixSession")?.json() as WixSessionCookie | undefined;
}

export function getSessionAccessToken(cookies: AstroCookies) {
  return getWixSessionCookie(cookies)?.tokens?.accessToken?.value ?? null;
}

export function getSessionMemberClient(cookies: AstroCookies) {
  const session = getWixSessionCookie(cookies);
  if (!session?.tokens?.accessToken?.value || !session?.tokens?.refreshToken?.value) {
    return null;
  }

  return createClient({
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens: {
        accessToken: {
          value: session.tokens.accessToken.value,
          expiresAt: session.tokens.accessToken.expiresAt ?? 0,
        },
        refreshToken: {
          value: session.tokens.refreshToken.value,
          role: session.tokens.refreshToken.role === MEMBER_ROLE ? "member" : "visitor",
        },
      },
    }),
    modules: { members: wixMembers },
  });
}

export function getSessionDataClient(cookies: AstroCookies) {
  const session = getWixSessionCookie(cookies);
  if (!session?.tokens?.accessToken?.value || !session?.tokens?.refreshToken?.value) {
    return null;
  }

  return createClient({
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens: {
        accessToken: {
          value: session.tokens.accessToken.value,
          expiresAt: session.tokens.accessToken.expiresAt ?? 0,
        },
        refreshToken: {
          value: session.tokens.refreshToken.value,
          role: session.tokens.refreshToken.role === MEMBER_ROLE ? "member" : "visitor",
        },
      },
    }),
    modules: { items, members: wixMembers },
  });
}

export async function queryFeedbackAdminRows(cookies: AstroCookies, limit = 200) {
  const client = getSessionDataClient(cookies);
  if (!client) {
    throw new Error("Authentication required");
  }

  return client.items.query<{
    _id: string;
    _createdDate?: Date;
    _updatedDate?: Date;
    trendId?: string;
    trendTitle?: string;
    action?: string;
    memberEmail?: string;
  }>(FEEDBACK_COLLECTION_ID)
    .descending("_createdDate")
    .limit(limit)
    .find({ consistentRead: true, returnTotalCount: true });
}

export async function getCurrentMemberLoginEmail(cookies?: AstroCookies) {
  try {
    const sessionClient = cookies ? getSessionMemberClient(cookies) : null;
    const { member } = sessionClient
      ? await sessionClient.members.getCurrentMember({ fieldsets: ["EXTENDED"] })
      : await wixMembers.getCurrentMember({ fieldsets: ["EXTENDED"] });
    const loginEmail = member?.loginEmail ?? member?.contact?.emails?.[0];
    return loginEmail?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function hasAllowedWixMemberSession(cookies: AstroCookies) {
  if (!hasMemberSession(cookies)) {
    return false;
  }

  const loginEmail = await getCurrentMemberLoginEmail(cookies);
  return loginEmail?.endsWith(ALLOWED_MEMBER_EMAIL_DOMAIN) ?? false;
}

export function isAllowedMemberEmail(loginEmail: string | null) {
  return loginEmail?.endsWith(ALLOWED_MEMBER_EMAIL_DOMAIN) ?? false;
}

export function sanitizeReturnToUrl(returnToUrl: string | null | undefined) {
  if (!returnToUrl || !returnToUrl.startsWith("/")) {
    return "/";
  }

  if (returnToUrl.startsWith("//") || returnToUrl.includes("\\")) {
    return "/";
  }

  return returnToUrl;
}

export function buildLoginHref(returnToUrl: string, deniedReason?: "domain") {
  const params = new URLSearchParams({ returnToUrl: sanitizeReturnToUrl(returnToUrl) });
  if (deniedReason) {
    params.set("denied", deniedReason);
  }

  return `/login?${params.toString()}`;
}

export function buildDeniedAccessHref(returnToUrl: string) {
  const params = new URLSearchParams({ returnToUrl: sanitizeReturnToUrl(returnToUrl) });
  return `/access-denied?${params.toString()}`;
}

export function buildSignOutHref(returnToUrl: string) {
  const params = new URLSearchParams({ returnToUrl: sanitizeReturnToUrl(returnToUrl) });
  return `/sign-out?${params.toString()}`;
}

export function buildLogoutHref(returnToUrl: string) {
  return `/api/auth/logout?returnToUrl=${encodeURIComponent(sanitizeReturnToUrl(returnToUrl))}`;
}
