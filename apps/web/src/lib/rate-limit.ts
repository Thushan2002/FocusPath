import "server-only";
import type { Redis } from "ioredis";

// Fixed-window counter; INCR + PEXPIRE in one script so concurrent requests can't race.
const CONSUME = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {n, ttl}
`;

export interface Rule {
  /** seconds */
  window: number;
  max: number;
}

export async function consume(r: Redis, key: string, rule: Rule): Promise<{ allowed: boolean; retryAfter: number | null }> {
  const [n, ttl] = (await r.eval(CONSUME, 1, `rl:${key}`, String(rule.window * 1000))) as [number, number];
  if (n <= rule.max) return { allowed: true, retryAfter: null };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) };
}

/** Per-user limits for AI-backed routes. */
export const AI_LIMITS = {
  roadmap: { window: 3600, max: 5 },
  generate: { window: 600, max: 20 },
  tutor: { window: 60, max: 12 },
  hint: { window: 60, max: 10 },
  explanation: { window: 300, max: 10 },
} satisfies Record<string, Rule>;
