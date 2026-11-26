import "server-only";
import { eq, sum } from "drizzle-orm";
import { streaks, xpEvents, type DbExecutor } from "@focuspath/db";
import { XP_RULES, applyEvidenceDay, localDate, type XpSource } from "@focuspath/shared";
import { db } from "../db";

/**
 * Award XP for one piece of meaningful evidence. `sourceId` makes it idempotent: the same
 * evidence can never pay twice. Any award also counts the day toward the streak.
 */
export async function awardXp(
  tx: DbExecutor,
  userId: string,
  source: XpSource,
  sourceId: string,
  timezone: string,
): Promise<number> {
  const amount = XP_RULES[source];
  const inserted = await tx
    .insert(xpEvents)
    .values({ userId, amount, sourceType: source, sourceId })
    .onConflictDoNothing()
    .returning({ id: xpEvents.id });
  if (!inserted.length) return 0;
  await recordEvidenceDay(tx, userId, timezone);
  return amount;
}

export async function recordEvidenceDay(tx: DbExecutor, userId: string, timezone: string) {
  const day = localDate(new Date(), timezone);
  const [s] = await tx.select().from(streaks).where(eq(streaks.userId, userId));
  const next = applyEvidenceDay(
    {
      current: s?.current ?? 0,
      longest: s?.longest ?? 0,
      lastEvidenceDate: s?.lastEvidenceDate ?? null,
    },
    day,
  );
  await tx
    .insert(streaks)
    .values({ userId, ...next })
    .onConflictDoUpdate({ target: streaks.userId, set: next });
}

export async function totalXp(userId: string): Promise<number> {
  const [r] = await db()
    .select({ total: sum(xpEvents.amount) })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  return Number(r?.total ?? 0);
}

export async function getStreak(userId: string) {
  const [s] = await db().select().from(streaks).where(eq(streaks.userId, userId));
  return {
    current: s?.current ?? 0,
    longest: s?.longest ?? 0,
    lastEvidenceDate: s?.lastEvidenceDate ?? null,
  };
}
