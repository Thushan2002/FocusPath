import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const base = { DATABASE_URL: "postgres://x", AI_SERVICE_SECRET: "secret-123" };

describe("loadConfig", () => {
  it("applies defaults for optional settings", () => {
    const cfg = loadConfig(base);
    expect(cfg.redisUrl).toBe("redis://localhost:6379");
    expect(cfg.ai).toEqual({ baseUrl: "http://127.0.0.1:8000", secret: "secret-123" });
    expect(cfg.smtp.port).toBe(1025);
    expect(cfg.healthPort).toBe(8001);
  });

  it("reads overrides from the environment", () => {
    const cfg = loadConfig({
      ...base,
      SMTP_PORT: "2525",
      WORKER_HEALTH_PORT: "9001",
      APP_URL: "https://app.example",
    });
    expect(cfg.smtp.port).toBe(2525);
    expect(cfg.healthPort).toBe(9001);
    expect(cfg.appUrl).toBe("https://app.example");
  });

  it("fails fast when a required secret is missing", () => {
    expect(() => loadConfig({ DATABASE_URL: "postgres://x" })).toThrow(
      "AI_SERVICE_SECRET is not set",
    );
    expect(() => loadConfig({ AI_SERVICE_SECRET: "s" })).toThrow("DATABASE_URL is not set");
  });
});
