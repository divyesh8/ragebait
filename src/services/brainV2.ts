/**
 * Brain v2 — Phase 2 of the self-developed AI: local semantic similarity,
 * conversation graph, and a multi-judge panel. No external APIs, no model
 * downloads; everything is deterministic and explainable.
 *
 * BRAIN_VERSION is stamped into every JudgeResult so each completed battle
 * records exactly which brain judged it (audits, debugging, comparisons).
 */

export const BRAIN_VERSION = "brain-v2.0";

// =========================================================
// Semantic similarity — TF n-gram cosine (no embeddings API)
// =========================================================

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "am",
  "i", "you", "he", "she", "it", "we", "they", "your", "my", "his", "her",
  "than", "then", "that", "this", "these", "those", "at", "in", "on", "of",
  "to", "and", "or", "but", "so", "like", "just", "least", "even",
]);

function stem(word: string): string {
  return word.replace(/(ings?|ers?|ed|ly|es)$/u, "").replace(/s$/u, "") || word;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

function buildVector(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  const add = (key: string, w: number) => vec.set(key, (vec.get(key) ?? 0) + w);
  const toks = tokens(text);
  for (const t of toks) add(`w:${t}`, 2);
  for (let i = 0; i < toks.length - 1; i++) add(`b:${toks[i]}_${toks[i + 1]}`, 3);
  const chars = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  for (let i = 0; i < chars.length - 2; i++) add(`c:${chars.slice(i, i + 3)}`, 1);
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) {
    na += v * v;
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  for (const v of b.values()) nb += v * v;
  return !na || !nb ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 0..1 semantic similarity between two messages. */
export function similarity(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  return cosine(buildVector(a), buildVector(b));
}

/** Reworded-same-joke threshold. */
export const REUSED_JOKE_THRESHOLD = 0.55;
/** Reply-engagement threshold (a counter references what it answers). */
export const COUNTER_THRESHOLD = 0.16;
/** Callback threshold (referencing a line from ≥2 messages earlier). */
export const CALLBACK_THRESHOLD = 0.3;

// =========================================================
// Conversation graph — replies, counters, callbacks,
// reused jokes, unanswered attacks
// =========================================================

export interface GraphMessage {
  side: "creator" | "opponent";
  content: string;
  round: number;
}

export interface SideGraphStats {
  directCounters: number;
  callbacks: number;
  reusedLines: number;
  unansweredAttacksReceived: number; // attacks at them they never answered
  attacksLandedUnanswered: number;   // their attacks the opponent never answered
  messages: number;
}

export interface ConversationGraph {
  perSide: Record<"creator" | "opponent", SideGraphStats>;
  insights: string[];
}

const ATTACK_MARKERS = /\b(you|your|ur|u r|nuvvu|tu|tum)\b/i;
const COUNTER_MARKERS = /\b(at least|still|actually|but|says the|look who|and yet|atleast)\b/i;

export function buildConversationGraph(messages: GraphMessage[]): ConversationGraph {
  const empty = (): SideGraphStats => ({
    directCounters: 0, callbacks: 0, reusedLines: 0,
    unansweredAttacksReceived: 0, attacksLandedUnanswered: 0, messages: 0,
  });
  const perSide = { creator: empty(), opponent: empty() };
  const insights: string[] = [];
  const vectors = messages.map((m) => buildVector(m.content));

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const mine = perSide[msg.side];
    mine.messages++;

    // Reused joke: too similar to any of the SAME player's earlier lines.
    let reused = false;
    for (let j = 0; j < i; j++) {
      if (messages[j].side !== msg.side) continue;
      if (cosine(vectors[i], vectors[j]) >= REUSED_JOKE_THRESHOLD) { reused = true; break; }
    }
    if (reused) {
      mine.reusedLines++;
      insights.push(`${msg.side} reused a joke in round ${msg.round}: "${msg.content.slice(0, 60)}"`);
      continue; // a recycled line can't also earn counter/callback credit
    }

    // Direct counter: engages the opponent's immediately-previous message —
    // either semantically similar to it or using counter phrasing against an attack.
    const prev = i > 0 ? messages[i - 1] : null;
    if (prev && prev.side !== msg.side) {
      const engages = cosine(vectors[i], vectors[i - 1]) >= COUNTER_THRESHOLD;
      const counters = COUNTER_MARKERS.test(msg.content) && ATTACK_MARKERS.test(prev.content);
      if (engages || counters) {
        mine.directCounters++;
        if (mine.directCounters <= 2) {
          insights.push(`${msg.side} directly countered in round ${msg.round}: "${msg.content.slice(0, 60)}"`);
        }
      } else if (ATTACK_MARKERS.test(prev.content)) {
        // The previous message attacked them and this reply didn't engage it.
        mine.unansweredAttacksReceived++;
        perSide[prev.side].attacksLandedUnanswered++;
      }
    }

    // Callback: references a line from ≥2 messages earlier (either player's).
    for (let j = 0; j < i - 1; j++) {
      const s = cosine(vectors[i], vectors[j]);
      if (s >= CALLBACK_THRESHOLD && s < REUSED_JOKE_THRESHOLD) {
        mine.callbacks++;
        break;
      }
    }
  }

  return { perSide, insights: insights.slice(0, 6) };
}

// =========================================================
// Judge panel — multiple personas, final = average of judges
// =========================================================

/** The category scores a persona weighs (matches JudgeScore fields). */
export type CategoryScores = Record<string, number | undefined>;

interface JudgePersona {
  name: string;
  weights: Record<string, number>;
}

const PANEL: JudgePersona[] = [
  { name: "Strict Judge", weights: { logic: 1.5, consistency: 1.3, topicAdherence: 1.3, relevance: 1.2, counterarguments: 1.2 } },
  { name: "Comedy Judge", weights: { humor: 1.7, entertainment: 1.3, originality: 1.1, creativity: 1 } },
  { name: "Savage Judge", weights: { comeback: 1.6, confidence: 1.3, audienceImpact: 1.2, adaptability: 1 } },
  { name: "Meme Judge", weights: { creativity: 1.5, originality: 1.4, audienceImpact: 1.2, humor: 1 } },
  { name: "Audience Judge", weights: { audienceImpact: 1.5, entertainment: 1.4, conversationFlow: 1.1, humor: 1 } },
];

export interface PanelVote {
  judge: string;
  creator: number;
  opponent: number;
  verdict: "creator" | "opponent" | "draw";
}

export interface PanelResult {
  votes: PanelVote[];
  average: { creator: number; opponent: number };
  summary: string;
}

function personaScore(scores: CategoryScores, weights: Record<string, number>): number {
  let weighted = 0, total = 0;
  for (const [key, w] of Object.entries(weights)) {
    const v = Number(scores[key]);
    if (Number.isFinite(v)) { weighted += v * w; total += w; }
  }
  return total ? Math.round(weighted / total) : 0;
}

/**
 * Runs all personas plus the style judge (the rule-engine-weighted total the
 * caller already computed) and averages them into the final panel score.
 */
export function runJudgePanel(
  creator: CategoryScores & { total: number },
  opponent: CategoryScores & { total: number }
): PanelResult {
  const votes: PanelVote[] = PANEL.map((p) => {
    const c = personaScore(creator, p.weights);
    const o = personaScore(opponent, p.weights);
    return {
      judge: p.name,
      creator: c,
      opponent: o,
      verdict: Math.abs(c - o) <= 1 ? "draw" : c > o ? "creator" : "opponent",
    };
  });
  votes.push({
    judge: "Style Judge",
    creator: creator.total,
    opponent: opponent.total,
    verdict: Math.abs(creator.total - opponent.total) <= 1 ? "draw" : creator.total > opponent.total ? "creator" : "opponent",
  });

  const average = {
    creator: Math.round(votes.reduce((s, v) => s + v.creator, 0) / votes.length),
    opponent: Math.round(votes.reduce((s, v) => s + v.opponent, 0) / votes.length),
  };
  const creatorWins = votes.filter((v) => v.verdict === "creator").length;
  const opponentWins = votes.filter((v) => v.verdict === "opponent").length;

  return {
    votes,
    average,
    summary: `Panel of ${votes.length} judges: ${creatorWins} for creator, ${opponentWins} for opponent, ${votes.length - creatorWins - opponentWins} draws.`,
  };
}
