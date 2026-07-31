import { sql } from "@/lib/db";
import type { RageMindInput } from "@/services/rageMind";

export type RelationshipType = "friends" | "rivals" | "strangers" | "respectful_competitors" | "long_term_enemies";

export interface RelationshipAnalysis {
  relationshipType: RelationshipType;
  confidence: number;
  battleHistoryCount: number;
  rivalryScore: number;
  respectSignals: string[];
  hostilitySignals: string[];
  memorySignals: string[];
  summary: string;
}

export async function analyzeRelationship(input: RageMindInput): Promise<RelationshipAnalysis> {
  const local = localRelationship(input);
  const creator = input.players.find((player) => player.side === "creator");
  const opponent = input.players.find((player) => player.side === "opponent");
  if (!creator || !opponent) return local;

  try {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total_battles,
        COUNT(*) FILTER (WHERE winner_id IS NOT NULL)::int AS decided_battles,
        COUNT(*) FILTER (WHERE winner_id = ${creator.userId})::int AS creator_wins,
        COUNT(*) FILTER (WHERE winner_id = ${opponent.userId})::int AS opponent_wins
      FROM battles
      WHERE (
        (created_by = ${creator.userId} AND opponent_id = ${opponent.userId})
        OR
        (created_by = ${opponent.userId} AND opponent_id = ${creator.userId})
      )
        AND battle_source = 'PLAYER_VS_PLAYER'
        AND is_ai_generated = FALSE
    `;
    const memoryRows = await sql`
      SELECT user_id, best_opponents, worst_opponents, successful_strategies, recurring_mistakes
      FROM player_ragemind_memories
      WHERE user_id IN (${creator.userId}, ${opponent.userId})
    `;
    const battleHistoryCount = Number(rows[0]?.total_battles ?? 0);
    const rivalryScore = clamp(local.rivalryScore + battleHistoryCount * 10 + Number(rows[0]?.decided_battles ?? 0) * 4);
    const memorySignals = memoryRows
      .flatMap((row) => [
        ...toStringArray(row.best_opponents),
        ...toStringArray(row.worst_opponents),
        ...toStringArray(row.successful_strategies),
        ...toStringArray(row.recurring_mistakes),
      ])
      .slice(0, 8);
    const relationshipType = inferRelationshipType(battleHistoryCount, rivalryScore, local.respectSignals, local.hostilitySignals);

    return {
      ...local,
      relationshipType,
      confidence: clamp(local.confidence + Math.min(22, battleHistoryCount * 6) + (memorySignals.length ? 8 : 0)),
      battleHistoryCount,
      rivalryScore,
      memorySignals,
      summary: summarize(relationshipType, battleHistoryCount, rivalryScore, local.respectSignals, local.hostilitySignals),
    };
  } catch {
    return local;
  }
}

function localRelationship(input: RageMindInput): RelationshipAnalysis {
  const text = input.messages.map((message) => message.content).join(" ");
  const respectSignals = input.messages
    .filter((message) => /\b(respect|gg|fair|valid|good point|nice one)\b/i.test(message.content))
    .map((message) => `${message.username} showed respect in round ${message.round}.`);
  const hostilitySignals = input.messages
    .filter((message) => /\b(always|again|every time|same old|enemy|hate you|obsessed)\b/i.test(message.content))
    .map((message) => `${message.username} hinted at prior tension or hostility in round ${message.round}.`);
  const rivalryScore = clamp(25 + hostilitySignals.length * 18 + hits(text, /\b(rival|again|rematch|always|last time|every time)\b/gi) * 9);
  const relationshipType = inferRelationshipType(0, rivalryScore, respectSignals, hostilitySignals);

  return {
    relationshipType,
    confidence: respectSignals.length || hostilitySignals.length ? 66 : 44,
    battleHistoryCount: 0,
    rivalryScore,
    respectSignals,
    hostilitySignals,
    memorySignals: [],
    summary: summarize(relationshipType, 0, rivalryScore, respectSignals, hostilitySignals),
  };
}

function inferRelationshipType(
  battleHistoryCount: number,
  rivalryScore: number,
  respectSignals: string[],
  hostilitySignals: string[]
): RelationshipType {
  if (battleHistoryCount >= 5 && hostilitySignals.length >= 2 && rivalryScore > 72) return "long_term_enemies";
  if (battleHistoryCount >= 2 || rivalryScore > 62) return "rivals";
  if (respectSignals.length >= 2) return "respectful_competitors";
  if (respectSignals.length && !hostilitySignals.length) return "friends";
  return "strangers";
}

function summarize(
  type: RelationshipType,
  historyCount: number,
  rivalryScore: number,
  respectSignals: string[],
  hostilitySignals: string[]
): string {
  if (historyCount > 0) {
    return `Relationship read: ${type.replace(/_/g, " ")} with ${historyCount} prior battle${historyCount === 1 ? "" : "s"} and ${rivalryScore}% rivalry pressure.`;
  }
  if (respectSignals.length) return "Relationship read: respectful competitor energy appears from in-battle acknowledgement.";
  if (hostilitySignals.length) return "Relationship read: rivalry is inferred from hostile or history-coded language.";
  return "Relationship read: no reliable prior relationship signal, so judge as strangers unless transcript context says otherwise.";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => item.slice(0, 180)) : [];
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
