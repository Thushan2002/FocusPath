import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { vi } from "vitest";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)), quiet: true });

// Integration tests run against the dedicated test database.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DISABLE_RATE_LIMIT = "1";

vi.mock("server-only", () => ({}));
