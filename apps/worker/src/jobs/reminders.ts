import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { concepts, revisionItems, users, type Database } from "@focuspath/db";
import type { Mailer } from "../mailer";

/** One email per learner listing everything that's due and not yet reminded. */
export async function sendDueReminders(db: Database, mailer: Mailer, now = new Date()): Promise<number> {
  const due = await db
    .select({ item: revisionItems, email: users.email, name: users.name, conceptTitle: concepts.title })
    .from(revisionItems)
    .innerJoin(users, eq(users.id, revisionItems.userId))
    .innerJoin(concepts, eq(concepts.id, revisionItems.conceptId))
    .where(and(isNull(revisionItems.completedAt), isNull(revisionItems.remindedAt), lte(revisionItems.dueAt, now)))
    .orderBy(asc(revisionItems.dueAt))
    .limit(500);

  const byUser = new Map<string, typeof due>();
  for (const d of due) byUser.set(d.item.userId, [...(byUser.get(d.item.userId) ?? []), d]);

  let sent = 0;
  for (const items of byUser.values()) {
    const first = items[0]!;
    await mailer.sendRevisionReminder(
      first.email,
      first.name,
      items.map((i) => ({ title: i.item.title, minutes: i.item.minutes, reason: i.item.reason })),
    );
    await db
      .update(revisionItems)
      .set({ remindedAt: now })
      .where(inArray(revisionItems.id, items.map((i) => i.item.id)));
    sent++;
  }
  return sent;
}
