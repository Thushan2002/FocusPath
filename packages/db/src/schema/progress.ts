/** Derived progress: mastery, revision schedule, recommendations, XP, streaks, focus events. */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  focusChoiceEnum,
  recommendationKindEnum,
  recommendationStatusEnum,
  revisionKindEnum,
} from "./enums";
import { concepts, goals, subtopics } from "./learning";

const id = () => uuid().primaryKey().defaultRandom();
const userId = () =>
  text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const conceptId = () =>
  uuid()
    .notNull()
    .references(() => concepts.id, { onDelete: "cascade" });
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

/** One row per (user, concept) plus one per (user, concept, subtopic) for the part breakdown. */
export const conceptMastery = pgTable(
  "concept_mastery",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    subtopicId: uuid().references(() => subtopics.id, { onDelete: "cascade" }),
    /** 0–100 estimate. Not a grade. */
    score: real().notNull(),
    quizComponent: real().notNull().default(0),
    practicalComponent: real().notNull().default(0),
    explanationComponent: real().notNull().default(0),
    quizCount: integer().notNull().default(0),
    exerciseCount: integer().notNull().default(0),
    explanationCount: integer().notNull().default(0),
    calcVersion: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.conceptId, t.subtopicId).nullsNotDistinct(),
    index().on(t.userId),
    index().on(t.conceptId),
  ],
);

export const revisionItems = pgTable(
  "revision_items",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    subtopicId: uuid().references(() => subtopics.id, { onDelete: "cascade" }),
    kind: revisionKindEnum().notNull(),
    title: text().notNull(),
    dueAt: timestamp({ withTimezone: true }).notNull(),
    intervalDays: integer().notNull(),
    minutes: integer().notNull(),
    reason: text().notNull(),
    schedulerVersion: text().notNull(),
    remindedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.dueAt), index().on(t.conceptId), index().on(t.dueAt)],
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: id(),
    userId: userId(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    conceptId: conceptId(),
    revisionItemId: uuid().references(() => revisionItems.id, { onDelete: "set null" }),
    kind: recommendationKindEnum().notNull(),
    title: text().notNull(),
    detail: text().notNull(),
    /** Human-readable "why" — required (product rule 4). */
    reason: text().notNull(),
    estMinutes: integer().notNull(),
    status: recommendationStatusEnum().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.userId, t.status),
    index().on(t.goalId),
    check("recommendation_reason_present", sql`length(trim(${t.reason})) >= 10`),
  ],
);

export const xpEvents = pgTable(
  "xp_events",
  {
    id: id(),
    userId: userId(),
    amount: integer().notNull(),
    sourceType: text().notNull(),
    sourceId: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.sourceType, t.sourceId), index().on(t.userId)],
);

export const streaks = pgTable("streaks", {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  current: integer().notNull().default(0),
  longest: integer().notNull().default(0),
  lastEvidenceDate: date({ mode: "string" }),
});

export const achievements = pgTable("achievements", {
  id: id(),
  key: text().notNull().unique(),
  title: text().notNull(),
  description: text().notNull(),
  target: integer().notNull().default(1),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: id(),
    userId: userId(),
    achievementId: uuid()
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    progress: integer().notNull().default(0),
    earnedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.userId, t.achievementId)],
);

export const focusEvents = pgTable(
  "focus_events",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    targetTopic: text().notNull(),
    onPath: boolean().notNull(),
    choice: focusChoiceEnum().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

