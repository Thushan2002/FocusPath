import { describe, expect, it } from "vitest";
import { topicMatches, topicWords } from "./topics";

describe("topicWords", () => {
  it("drops short words and stop words, keeps tech tokens", () => {
    expect(topicWords("Intro to Node.js and the C++ basics")).toEqual(["node.js", "c++"]);
  });
});

describe("topicMatches", () => {
  it("matches on a shared significant word, case-insensitively", () => {
    expect(topicMatches("React Fundamentals", "react")).toBe(true);
  });
  it("ignores stop words when matching", () => {
    expect(topicMatches("Python basics", "SQL basics")).toBe(false);
  });
});
