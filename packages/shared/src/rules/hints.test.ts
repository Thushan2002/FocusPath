import { describe, expect, it } from "vitest";
import { MAX_HINT_LEVEL } from "../enums";
import { firstPerKey, usedAnswerHint } from "./hints";

describe("usedAnswerHint", () => {
  it("is false below the final level and true at or above it", () => {
    expect(usedAnswerHint(0)).toBe(false);
    expect(usedAnswerHint(MAX_HINT_LEVEL - 1)).toBe(false);
    expect(usedAnswerHint(MAX_HINT_LEVEL)).toBe(true);
  });
});

describe("firstPerKey", () => {
  it("keeps the first occurrence per key in input order", () => {
    const rows = [
      { ex: "a", hint: 0 },
      { ex: "b", hint: 3 },
      { ex: "a", hint: 2 },
    ];
    expect(firstPerKey(rows, (r) => r.ex)).toEqual([
      { ex: "a", hint: 0 },
      { ex: "b", hint: 3 },
    ]);
  });

  it("returns an empty list for no input", () => {
    expect(firstPerKey([], (x: number) => x)).toEqual([]);
  });
});
