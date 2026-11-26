import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/** Typed worker configuration, read once at startup. Fails fast on missing secrets. */
export interface WorkerConfig {
  databaseUrl: string;
  redisUrl: string;
  ai: { baseUrl: string; secret: string };
  smtp: { host: string; port: number; from: string };
  appUrl: string;
  healthPort: number;
  roadmapConcurrency: number;
  reminderEveryMs: number;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return {
    databaseUrl: required(env, "DATABASE_URL"),
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    ai: {
      baseUrl: env.AI_SERVICE_URL ?? "http://127.0.0.1:8000",
      secret: required(env, "AI_SERVICE_SECRET"),
    },
    smtp: {
      host: env.SMTP_HOST ?? "localhost",
      port: Number(env.SMTP_PORT ?? 1025),
      from: env.SMTP_FROM ?? "FocusPath AI <no-reply@focuspath.local>",
    },
    appUrl: env.APP_URL ?? "http://localhost:3000",
    healthPort: Number(env.WORKER_HEALTH_PORT ?? 8001),
    roadmapConcurrency: 2,
    reminderEveryMs: 15 * 60 * 1000,
  };
}

/** The monorepo keeps a single .env at the root. */
export function loadRootEnv() {
  loadDotenv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
}
