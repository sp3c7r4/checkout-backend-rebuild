import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import env from "./src/config/env";
 
// Public root origin of this server; in production set API_ORIGIN.
const apiOrigin = env.API_ORIGIN ?? `http://localhost:${env.PORT}`;

// When the SPA is served from a different site (Amplify) than the API, the
// session cookie is a cross-site cookie: it must be Secure + SameSite=None or
// the browser never sends it back to the API.
const crossSite =
  apiOrigin.startsWith("https://") &&
  env.WEB_ORIGIN.replace(/\/+$/, "") !== apiOrigin.replace(/\/+$/, "");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
      provider: "pg"
    }),
  secret: env.BETTER_AUTH_SECRET || "your-secret-key-here", // Required for session signing
  trustedOrigins: [
    env.WEB_ORIGIN, // frontend (dev: http://localhost:5173)
    apiOrigin,
  ],
  ...(crossSite
    ? {
        useSecureCookies: true,
        advanced: { defaultCookieAttributes: { sameSite: "none" as const, secure: true } },
      }
    : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // no cookieCache: it would serve a stale user.business_id right after business creation
  },
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
    google: { 
      clientId: env.GOOGLE_CLIENT_ID as string, 
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline", 
      prompt: "select_account+consent",
      scope: [
        "openid",
        "profile",
        "email",
      ],
      redirectURI: `${apiOrigin}/api/auth/callback/google`
    } 
        },
      }
    : {}),
  emailAndPassword: { 
    enabled: true, 
  },
  user: {
    additionalFields: {
      business_id: {
        type: "string",
        required: false,
        input: true
      }     
    }
  },
  baseURL: apiOrigin,
});