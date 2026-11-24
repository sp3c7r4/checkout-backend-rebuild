import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import env from "../config/env";

export const PENDING_COOKIE = "mp_pending";

/**
 * The pending cookie travels in a response to a *cross-site* POST from AWS,
 * which browsers only store when it is `Secure; SameSite=None`. On plain HTTP
 * (local dev) that is impossible, so fall back to Lax and accept that the
 * cross-site hop cannot be completed without TLS.
 */
const isHttps = (origin: string | undefined) => (origin ?? "").startsWith("https://");

export function pendingCookieOptions() {
  const secure = isHttps(env.API_ORIGIN);
  return {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: secure ? ("none" as const) : ("lax" as const),
  };
}

export function setPendingCookie(c: any, id: string, maxAgeSeconds: number) {
  setCookie(c, PENDING_COOKIE, id, { ...pendingCookieOptions(), maxAge: maxAgeSeconds });
}

export function readPendingCookie(c: any): string | undefined {
  return getCookie(c, PENDING_COOKIE);
}

export function clearPendingCookie(c: any) {
  deleteCookie(c, PENDING_COOKIE, pendingCookieOptions());
}

/** Never log the token; this only reports whether one was present. */
export function tokenFingerprint(token: string | undefined): string {
  if (!token) return "absent";
  return `present:${token.length}`;
}
