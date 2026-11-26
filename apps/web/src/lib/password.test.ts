import { describe, expect, it } from "vitest";
import { passwordStrength, safeNext } from "./password";

describe("password strength", () => {
  it("scores like the design", () => {
    expect(passwordStrength("short").score).toBe(0);
    expect(passwordStrength("abcdefgh").score).toBe(1);
    expect(passwordStrength("focus2026").score).toBe(2);
    expect(passwordStrength("Focus2026").score).toBe(3);
    expect(passwordStrength("Focus2026!").score).toBe(4);
    expect(passwordStrength("").label).toMatch(/8\+ characters/);
  });
});

describe("safeNext", () => {
  it("only allows same-origin paths", () => {
    expect(safeNext("/roadmap")).toBe("/roadmap");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null, "/today")).toBe("/today");
  });
});
