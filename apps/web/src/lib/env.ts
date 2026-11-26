import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default("FocusPath AI <no-reply@focuspath.local>"),
  AI_SERVICE_URL: z.url().default("http://127.0.0.1:8000"),
  AI_SERVICE_SECRET: z.string().min(8),
});

let cached: z.infer<typeof EnvSchema> | undefined;

export function env() {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}

export const googleEnabled = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
