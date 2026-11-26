import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { schema } from "@focuspath/db";
import { db } from "./db";
import { env, googleEnabled } from "./env";
import { sendMail } from "./mailer";
import { consume } from "./rate-limit";
import { redis } from "./redis";

function createAuth() {
  return betterAuth({
    baseURL: env().APP_URL,
    secret: env().BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), {
      provider: "pg",
      usePlural: true,
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendMail(
          user.email,
          "Reset your FocusPath password",
          `Hi ${user.name},\n\nReset your password here (valid for 1 hour):\n${url}\n\nIf you didn't ask for this, ignore this email.`,
          `<p>Hi ${escapeHtml(user.name)},</p><p><a href="${url}">Reset your password</a> (valid for 1 hour).</p><p>If you didn't ask for this, ignore this email.</p>`,
        );
      },
    },
    socialProviders: googleEnabled()
      ? { google: { clientId: env().GOOGLE_CLIENT_ID, clientSecret: env().GOOGLE_CLIENT_SECRET } }
      : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: process.env.DISABLE_RATE_LIMIT !== "1",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
        "/reset-password": { window: 300, max: 5 },
      },
      customStorage: { consume: (key, rule) => consume(redis(), `auth:${key}`, rule) },
    },
    plugins: [nextCookies()],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { __fpAuth?: Auth };

export function auth(): Auth {
  g.__fpAuth ??= createAuth();
  return g.__fpAuth;
}
