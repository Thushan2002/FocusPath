import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** An open transaction handle, as passed to `db.transaction(async (tx) => ...)`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Anything that can run a query: the pool or an open transaction. Functions that take a
 * `DbExecutor` compose into a caller's transaction instead of opening their own.
 */
export type DbExecutor = Database | Transaction;

export function createDb(
  url: string,
  opts: { max?: number } = {},
): { db: Database; close: () => Promise<void> } {
  const client = postgres(url, { max: opts.max ?? 10, onnotice: () => {} });
  return { db: drizzle(client, { schema, casing: "snake_case" }), close: () => client.end() };
}

export { schema };
export * from "./schema";
