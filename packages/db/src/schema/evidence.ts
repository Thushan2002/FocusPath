/** Evidence of learning. Attempts and submissions are append-only history. */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { assessmentKindEnum, tutorRoleEnum } from "./enums";
import { concepts, subtopics } from "./learning";

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

export const studySessions = pgTable(
  "study_sessions",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp({ withTimezone: true }),
    activeSeconds: integer().notNull().default(0),
  },
  (t) => [index().on(t.userId, t.startedAt), index().on(t.conceptId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    kind: assessmentKindEnum().notNull().default("concept_quiz"),
    generatedBy: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.conceptId)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    assessmentId: uuid()
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    subtopicId: uuid().references(() => subtopics.id, { onDelete: "set null" }),
    position: integer().notNull(),
    prompt: text().notNull(),
    options: jsonb().$type<string[]>().notNull(),
    /** Never sent to the browser before an attempt is submitted. */
    correctIndex: integer().notNull(),
    rationale: text().notNull(),
  },
  (t) => [index().on(t.assessmentId)],
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: id(),
    assessmentId: uuid()
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: userId(),
    conceptId: conceptId(),
    answers: jsonb().$type<Record<string, number>>().notNull(),
    correct: integer().notNull(),
    total: integer().notNull(),
    /** 0–1 */
    score: real().notNull(),
    /** subtopic key → 0–1 */
    perSubtopic: jsonb().$type<Record<string, number>>().notNull(),
    submittedAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.conceptId)],
);

export interface StoredTest {
  name: string;
  call: string;
  expected: string;
}

export const exercises = pgTable(
  "exercises",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    subtopicId: uuid().references(() => subtopics.id, { onDelete: "set null" }),
    position: integer().notNull(),
    title: text().notNull(),
    prompt: text().notNull(),
    starterCode: text().notNull(),
    tests: jsonb().$type<StoredTest[]>().notNull(),
    /** Server-only: used by the tutor to shape hints. */
    solution: text().notNull(),
    isProject: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.conceptId)],
);

export const exerciseSubmissions = pgTable(
  "exercise_submissions",
  {
    id: id(),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    userId: userId(),
    conceptId: conceptId(),
    code: text().notNull(),
    testsPassed: integer().notNull(),
    testsTotal: integer().notNull(),
    solved: boolean().notNull(),
    /** Highest hint level revealed before this submission (from hint_requests, not the client). */
    maxHintLevelUsed: integer().notNull().default(0),
    results: jsonb().$type<{ name: string; passed: boolean; message: string | null }[]>().notNull(),
    submittedAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.exerciseId), index().on(t.conceptId)],
);

export const hintRequests = pgTable(
  "hint_requests",
  {
    id: id(),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    userId: userId(),
    level: integer().notNull(),
    text: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.exerciseId)],
);

export const explanations = pgTable(
  "explanations",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    text: text().notNull(),
    aiScore: real().notNull(),
    rubric: jsonb().$type<{ accuracy: number; completeness: number; ownWords: number }>().notNull(),
    feedback: text().notNull(),
    misconceptions: jsonb().$type<string[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.conceptId)],
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: id(),
    userId: userId(),
    conceptId: conceptId(),
    exerciseId: uuid().references(() => exercises.id, { onDelete: "set null" }),
    role: tutorRoleEnum().notNull(),
    content: jsonb()
      .$type<{ blocks: ({ type: "text"; text: string } | { type: "code"; code: string; language: string })[]; followups?: string[] }>()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.conceptId)],
);
