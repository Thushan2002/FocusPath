import "server-only";
import { Redis } from "ioredis";
import { env } from "./env";

const g = globalThis as unknown as { __fpRedis?: Redis };

export function redis(): Redis {
  g.__fpRedis ??= new Redis(env().REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
  return g.__fpRedis;
}
