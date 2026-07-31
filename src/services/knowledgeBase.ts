/**
 * AI Knowledge Base — local, editable, versioned dictionaries (ai_knowledge):
 * slang, Hinglish/Telugu/Tamil expressions, memes, abbreviations, emoji
 * meanings, and roast templates. Cached in memory; founders edit entries via
 * /api/creator/ai-rules. Engines merge these with their built-in dictionaries
 * so understanding improves without code changes.
 */

import { sql } from "@/lib/db";

export interface KnowledgeEntry {
  category: string;
  term: string;
  meaning: string;
  language: string;
  weight: number;
  version: number;
}

const CACHE_TTL_MS = 60_000;

let cache: KnowledgeEntry[] | null = null;
let cacheLoadedAt = 0;

async function loadKnowledge(): Promise<KnowledgeEntry[]> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;
  try {
    const rows = await sql`
      SELECT category, term, meaning, language, weight, version
      FROM ai_knowledge WHERE active = TRUE
    `;
    cache = rows as unknown as KnowledgeEntry[];
    cacheLoadedAt = now;
  } catch (err) {
    console.error("Knowledge base: could not load ai_knowledge, using empty set:", err);
    cache = cache ?? [];
    cacheLoadedAt = now;
  }
  return cache;
}

export function invalidateKnowledgeCache() {
  cache = null;
  cacheLoadedAt = 0;
}

export async function getKnowledge(category?: string): Promise<KnowledgeEntry[]> {
  const all = await loadKnowledge();
  return category ? all.filter((e) => e.category === category) : all;
}

/** Case-insensitive term lookup across categories, longest terms first. */
export async function findKnownTerms(text: string, categories?: string[]): Promise<KnowledgeEntry[]> {
  const all = await loadKnowledge();
  const lower = text.toLowerCase();
  return all
    .filter((e) => (!categories || categories.includes(e.category)) && lower.includes(e.term.toLowerCase()))
    .sort((a, b) => b.term.length - a.term.length);
}
