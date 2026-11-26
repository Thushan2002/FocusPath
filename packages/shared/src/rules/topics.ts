const STOP_WORDS = new Set(["and", "the", "with", "for", "intro", "basics"]);

/** Significant words of a topic title, lower-cased. Keeps tech tokens like "c++", "c#", "node.js". */
export function topicWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Does a roadmap title share a significant word with the topic the learner typed? */
export function topicMatches(title: string, typedTopic: string): boolean {
  const target = new Set(topicWords(typedTopic));
  return topicWords(title).some((w) => target.has(w));
}
