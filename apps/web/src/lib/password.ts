export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const LABELS = [
  "Too short — use at least 8 characters",
  "Weak — add numbers or symbols",
  "Okay — mix upper and lower case",
  "Good",
  "Strong password",
];
const COLORS = ["#C2620E", "#C2620E", "#B8860B", "#0D6E5F", "#0D6E5F"];

/** Same heuristic as the design's sign-up artboard. */
export function passwordStrength(p: string): Strength {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[0-9]/.test(p) && /[a-zA-Z]/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p) || p.length >= 14) score++;
  if (p.length < 8) score = 0;
  const s = score as Strength["score"];
  return { score: s, label: p.length ? LABELS[s]! : "Use 8+ characters with letters and numbers", color: COLORS[s]! };
}

/** Only allow same-origin relative redirects after login. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
