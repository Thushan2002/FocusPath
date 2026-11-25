/** Learner profile, goals and the versioned roadmap structure. */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  evidenceKindEnum,
  goalStatusEnum,
  levelEnum,
  roadmapStatusEnum,
  struggleEnum,
  taskCompletionEnum,
  taskKindEnum,
} from "./enums";

const id = () => uuid().primaryKey().defaultRandom();
const userId = () =>
  text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const learnerProfiles = pgTable("learner_profiles", {
  id: id(),
  userId: userId().unique(),
  level: levelEnum().notNull(),
  priorKnowledge: text().notNull().default(""),
  dailyMinutes: integer().notNull(),
  targetMonths: integer().notNull(),
  struggle: struggleEnum().notNull(),
  timezone: text().notNull().default("UTC"),
  createdAt: createdAt(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const goals = pgTable(
  "goals",
  {
    id: id(),
    userId: userId(),
    title: text().notNull(),
    status: goalStatusEnum().notNull().default("active"),
    activeRoadmapId: uuid().references((): AnyPgColumn => roadmaps.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId)],
);

export const roadmaps = pgTable(
  "roadmaps",
  {
    id: id(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    userId: userId(),
    version: integer().notNull(),
    status: roadmapStatusEnum().notNull().default("generating"),
    title: text(),
    summary: text(),
    model: text(),
    promptVersion: text(),
    rawJson: jsonb(),
    error: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.goalId, t.version), index().on(t.userId), index().on(t.goalId)],
);

export const modules = pgTable(
  "modules",
  {
    id: id(),
    roadmapId: uuid()
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    key: text().notNull(),
    title: text().notNull(),
    milestone: text().notNull(),
    estWeeks: integer().notNull(),
  },
  (t) => [index().on(t.roadmapId)],
);

export const concepts = pgTable(
  "concepts",
  {
    id: id(),
    moduleId: uuid()
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    roadmapId: uuid()
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    /** Slug that stays the same across roadmap versions of a goal. */
    key: text().notNull(),
    title: text().notNull(),
    summary: text().notNull(),
    estMinutes: integer().notNull(),
  },
  (t) => [index().on(t.moduleId), uniqueIndex().on(t.roadmapId, t.key)],
);

export const conceptPrerequisites = pgTable(
  "concept_prerequisites",
  {
    conceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    requiresConceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.conceptId, t.requiresConceptId] })],
);

export const subtopics = pgTable(
  "subtopics",
  {
    id: id(),
    conceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    key: text().notNull(),
    title: text().notNull(),
  },
  (t) => [index().on(t.conceptId), uniqueIndex().on(t.conceptId, t.key)],
);

export const completionCriteria = pgTable("completion_criteria", {
  id: id(),
  conceptId: uuid()
    .notNull()
    .unique()
    .references(() => concepts.id, { onDelete: "cascade" }),
  quizPassPct: integer().notNull().default(70),
  exercisesRequired: integer().notNull().default(3),
  explanationRequired: boolean().notNull().default(true),
});

export const taskTemplates = pgTable(
  "task_templates",
  {
    id: id(),
    conceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    kind: taskKindEnum().notNull(),
    title: text().notNull(),
    minutes: integer().notNull(),
  },
  (t) => [index().on(t.conceptId)],
);

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: id(),
    userId: userId(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    planDate: date({ mode: "string" }).notNull(),
    focusConceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.planDate), index().on(t.goalId)],
);

export const dailyTasks = pgTable(
  "daily_tasks",
  {
    id: id(),
    dailyPlanId: uuid()
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    userId: userId(),
    conceptId: uuid()
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    kind: taskKindEnum().notNull(),
    evidenceKind: evidenceKindEnum().notNull(),
    title: text().notNull(),
    minutes: integer().notNull(),
    doneAt: timestamp({ withTimezone: true }),
    completedBy: taskCompletionEnum(),
    /** e.g. "assessment_attempt:<uuid>" — the evidence that completed the task. */
    evidenceRef: text(),
  },
  (t) => [index().on(t.userId), index().on(t.dailyPlanId), index().on(t.conceptId)],
);
