/**
 * Build an absolute URL to one of the app's routes.
 *
 * Wix's static hosting serves `/foo.html` but does NOT resolve the
 * extensionless `/foo` (it 504s), while `next dev` serves the extensionless
 * form locally. So append `.html` everywhere except localhost. Used for the
 * checkout return URL and the OAuth login-callback, which must be real,
 * loadable URLs on whatever host the app is running on.
 */
export function routeUrl(route: string, query?: Record<string, string>): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  const path = route === "/" ? "/" : isLocal ? route : `${route}.html`;
  const qs = query
    ? "?" + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
    : "";
  return `${origin}${path}${qs}`;
}
