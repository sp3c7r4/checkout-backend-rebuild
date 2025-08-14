import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import env from "./src/config/env";
 
export const auth = betterAuth({
  database: drizzleAdapter(db, {
      provider: "pg"
    }),
  secret: env.BETTER_AUTH_SECRET || "your-secret-key-here", // Required for session signing
  trustedOrigins: [
    "http://localhost:5173", // Your frontend
    `http://localhost:${env.PORT}`, // Your backend
    env.WEB_ORIGIN // Production frontend URL
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },
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
      redirectURI: `http://localhost:3000/api/auth/callback/google`
    } 
  },
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
  baseURL: `http://localhost:${env.PORT}`, // Your backend URL, not frontend
});