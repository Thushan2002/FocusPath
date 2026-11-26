import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

// E2E runs against the test database with the AI service in deterministic fake mode.
const env = {
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
  DISABLE_RATE_LIMIT: "1",
  AI_MODE: "fake",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../../services/ai",
      url: "http://localhost:8000/healthz",
      env,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @focuspath/worker start",
      cwd: "../..",
      url: "http://localhost:8001",
      env,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: process.env.CI ? "pnpm start" : "pnpm dev",
      url: "http://localhost:3000/login",
      env,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
