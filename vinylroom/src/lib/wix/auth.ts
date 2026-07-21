import { getBrowserClient, saveTokens, clearTokens, resetBrowserClient } from "./browser";
import { routeUrl } from "@/lib/site";

const OAUTH_KEY = "wix:oauth-data";
export const LOGIN_CALLBACK_PATH = "/login-callback";

export type Member = {
  id?: string;
  name: string;
  email?: string;
  initials: string;
} | null;

export class LoginCallbackError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "LoginCallbackError";
  }
}

type BrowserClient = NonNullable<ReturnType<typeof getBrowserClient>>;
type AuthState = {
  loginState: string;
  data?: {
    sessionToken?: string;
    stateToken?: string;
  };
  error?: string;
  errorCode?: string;
};

export type RegistrationResult =
  | { status: "signed-in"; member: Member }
  | { status: "verification-required"; stateToken: string };

function initials(name?: string): string {
  if (!name) return "♪";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function memberFromSessionToken(client: BrowserClient, sessionToken: string): Promise<Member> {
  const tokens = await client.auth.getMemberTokensForDirectLogin(sessionToken);
  client.auth.setTokens(tokens);
  saveTokens(tokens);
  resetBrowserClient();
  return getCurrentMember();
}

function authError(result: AuthState, fallback: string): LoginCallbackError {
  const messageByCode: Record<string, string> = {
    emailAlreadyExists: "That email is already a Wix Member. Sign in instead.",
    invalidPassword: "Wrong password, or this email is not a Wix Member yet. Create an account first.",
    resetPassword: "This member needs a password reset before signing in.",
    missingCaptchaToken: "Wix needs a captcha check before continuing. Try the hosted Wix sign-in flow.",
    invalidCaptchaToken: "The captcha check failed. Try again in a moment.",
    invalidEmail: "Enter a valid email address.",
  };
  const message = result.errorCode ? messageByCode[result.errorCode] : undefined;
  return new LoginCallbackError(message || result.error || fallback, result.errorCode || result.loginState);
}

/**
 * Kick off Wix member login: mint PKCE data, stash it, and redirect to the
 * Wix-hosted auth page. Returns `demo` (no redirect) when unconfigured.
 */
export async function login(returnTo = "/"): Promise<{ status: "redirect" | "demo" }> {
  const client = getBrowserClient();
  if (!client) return { status: "demo" };

  const redirectUri = routeUrl(LOGIN_CALLBACK_PATH);
  const oauthData = client.auth.generateOAuthData(redirectUri, returnTo);
  sessionStorage.setItem(OAUTH_KEY, JSON.stringify(oauthData));
  const { authUrl } = await client.auth.getAuthUrl(oauthData);
  window.location.href = authUrl;
  return { status: "redirect" };
}

export async function loginWithPassword(email: string, password: string): Promise<Member> {
  const client = getBrowserClient();
  if (!client) throw new LoginCallbackError("Connect a Wix Headless client ID first.", "demo");

  const result = (await client.auth.login({ email, password })) as AuthState;
  if (result.loginState !== "SUCCESS" || !result.data?.sessionToken) {
    throw authError(result, "Wix could not sign in with those details.");
  }

  return memberFromSessionToken(client, result.data.sessionToken);
}

export async function registerMember(
  email: string,
  password: string,
  name?: string,
): Promise<RegistrationResult> {
  const client = getBrowserClient();
  if (!client) throw new LoginCallbackError("Connect a Wix Headless client ID first.", "demo");

  const nickname = name?.trim();
  const result = (await client.auth.register({
    email,
    password,
    ...(nickname ? { profile: { nickname } } : {}),
  })) as AuthState;

  if (result.loginState === "SUCCESS" && result.data?.sessionToken) {
    return { status: "signed-in", member: await memberFromSessionToken(client, result.data.sessionToken) };
  }

  if (result.loginState === "EMAIL_VERIFICATION_REQUIRED" && result.data?.stateToken) {
    return { status: "verification-required", stateToken: result.data.stateToken };
  }

  if (result.loginState === "OWNER_APPROVAL_REQUIRED") {
    throw new LoginCallbackError(
      "Account created. It needs site owner approval before you can sign in.",
      result.loginState,
    );
  }

  throw authError(result, "Wix could not create that member account.");
}

export async function verifyMemberEmail(stateToken: string, verificationCode: string): Promise<Member> {
  const client = getBrowserClient();
  if (!client) throw new LoginCallbackError("Connect a Wix Headless client ID first.", "demo");

  const result = (await client.auth.processVerification(
    { verificationCode },
    { loginState: "EMAIL_VERIFICATION_REQUIRED", data: { stateToken } } as never,
  )) as AuthState;

  if (result.loginState !== "SUCCESS" || !result.data?.sessionToken) {
    throw authError(result, "Wix could not verify that code.");
  }

  return memberFromSessionToken(client, result.data.sessionToken);
}

/** Complete login on the callback route: exchange the code for member tokens. */
export async function completeLogin(): Promise<string> {
  const client = getBrowserClient();
  if (!client) return "/";

  const raw = sessionStorage.getItem(OAUTH_KEY);
  const oauthData = raw ? JSON.parse(raw) : null;
  if (!oauthData) return "/";

  const parsed = client.auth.parseFromUrl(window.location.href);
  if (parsed.error) {
    throw new LoginCallbackError(parsed.errorDescription || parsed.error, parsed.error);
  }

  const { code, state } = parsed;
  const tokens = await client.auth.getMemberTokens(code, state, oauthData);
  client.auth.setTokens(tokens);
  saveTokens(tokens);
  sessionStorage.removeItem(OAUTH_KEY);
  return oauthData.originalUri || "/";
}

export async function logout(): Promise<void> {
  const client = getBrowserClient();
  clearTokens();
  if (!client) {
    resetBrowserClient();
    return;
  }
  try {
    const { logoutUrl } = await client.auth.logout(window.location.origin);
    resetBrowserClient();
    window.location.href = logoutUrl;
  } catch {
    resetBrowserClient();
    window.location.reload();
  }
}

export function isLoggedIn(): boolean {
  const client = getBrowserClient();
  return !!client && client.auth.loggedIn();
}

/** Current member's display identity, or `null` if signed out / unconfigured. */
export async function getCurrentMember(): Promise<Member> {
  const client = getBrowserClient();
  if (!client || !client.auth.loggedIn()) return null;
  try {
    // The generated Members package still exposes this visitor method at runtime,
    // although its current aggregate module type omits it.
    const memberClient = client.members as unknown as {
      getCurrentMember: () => Promise<unknown>;
    };
    const res = (await memberClient.getCurrentMember()) as Record<string, unknown>;
    const m = ((res.member ?? res) ?? {}) as Record<string, unknown>;
    const profile = (m.profile ?? {}) as Record<string, unknown>;
    const contact = (m.contact ?? {}) as Record<string, unknown>;
    const email = m.loginEmail as string | undefined;
    const name =
      (profile.nickname as string) ||
      [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
      email ||
      "Listener";
    return { id: m._id as string, name, email, initials: initials(name) };
  } catch {
    return null;
  }
}
