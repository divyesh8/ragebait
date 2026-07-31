/**
 * Rule Engine — configurable AI values stored in the database (ai_rules),
 * cached in memory, with hard-coded safe defaults so the AI keeps working
 * even if the table is missing or the DB is unreachable. Founders edit
 * rules through /api/creator/ai-rules; no code changes or redeploys needed.
 */

import { sql } from "@/lib/db";

const CACHE_TTL_MS = 60_000;

let cache: Map<string, unknown> | null = null;
let cacheLoadedAt = 0;

async function loadRules(): Promise<Map<string, unknown>> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;
  try {
    const rows = await sql`SELECT key, value FROM ai_rules`;
    cache = new Map(rows.map((r: any) => [r.key as string, r.value]));
    cacheLoadedAt = now;
  } catch (err) {
    // Table missing or DB down — keep last known cache or fall back to defaults.
    console.error("Rule engine: could not load ai_rules, using defaults:", err);
    cache = cache ?? new Map();
    cacheLoadedAt = now;
  }
  return cache;
}

/** Force the next read to hit the database (called after founder edits). */
export function invalidateRuleCache() {
  cache = null;
  cacheLoadedAt = 0;
}

export async function getRule<T>(key: string, fallback: T): Promise<T> {
  const rules = await loadRules();
  const value = rules.get(key);
  return value === undefined || value === null ? fallback : (value as T);
}

/** Judge scoring weights per battle style; null means "use built-in defaults". */
export async function getJudgeWeights(): Promise<Record<string, Record<string, number>> | null> {
  const value = await getRule<Record<string, Record<string, number>> | null>("judge.weights", null);
  return value && typeof value === "object" ? value : null;
}

export interface ModerationThresholds {
  insult_warn_count: number;
  caps_ratio: number;
  caps_min_length: number;
  emoji_min_length: number;
  emoji_meaningful_ratio: number;
}

export const DEFAULT_MODERATION_THRESHOLDS: ModerationThresholds = {
  insult_warn_count: 3,
  caps_ratio: 0.8,
  caps_min_length: 20,
  emoji_min_length: 6,
  emoji_meaningful_ratio: 0.2,
};

export async function getModerationThresholds(): Promise<ModerationThresholds> {
  const value = await getRule<Partial<ModerationThresholds>>("moderation.thresholds", {});
  return { ...DEFAULT_MODERATION_THRESHOLDS, ...value };
}
