import type { BattleSide, RageMindInput, RageMindMessage } from "@/services/rageMind";

export const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "your", "you", "are", "was", "were",
  "from", "about", "have", "has", "had", "not", "but", "just", "like", "into",
  "they", "them", "their", "our", "will", "hai", "bro", "bhai", "macha", "anna",
]);

export function textOf(input: RageMindInput): string {
  return input.messages.map((message) => message.content).join("\n");
}

export function sideMessages(input: RageMindInput, side: BattleSide): RageMindMessage[] {
  return input.messages.filter((message) => message.side === side);
}

export function sideText(input: RageMindInput, side: BattleSide): string {
  return sideMessages(input, side).map((message) => message.content).join(" ");
}

export function keywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function uniqueRatio(text: string): number {
  const tokens = keywordTokens(text);
  if (!tokens.length) return 0;
  return new Set(tokens).size / tokens.length;
}

export function topTerms(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const token of keywordTokens(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

export function countHits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim()).map((value) => value.trim())));
}

export function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(keywordTokens(a));
  const bTokens = new Set(keywordTokens(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let shared = 0;
  for (const token of aTokens) if (bTokens.has(token)) shared++;
  return shared / Math.min(aTokens.size, bTokens.size);
}

export function nowMs(): number {
  return Date.now();
}
