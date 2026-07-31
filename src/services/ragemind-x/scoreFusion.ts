/**
 * RageMind X — Score Fusion Layer (Phase 1: scaffold only).
 *
 * This is the single seam where, in later phases, every RageMind cognitive
 * function (NLP, Memory, Retrieval, Reasoning, Planner, Critic, Safety) will
 * enrich a shared World Model, and the fused category scores will be derived
 * from that unified understanding — NOT from independent weighted votes.
 *
 * PHASE 1 CONTRACT (this file today): identity by construction.
 *   - It records the already-final heuristic + conversation-graph scores as
 *     provenance contributions, and returns fusedValue === the input value.
 *   - It NEVER recomputes or mutates a score. The numbers that flow to the
 *     judge panel are untouched, so winners are provably unchanged.
 *   - Its only job now is to prove deterministic execution, full observability,
 *     and complete traceability before any RageMind module is allowed to
 *     influence a verdict (Phase 2+).
 *
 * The types below are deliberately shaped for the approved Rev 3 architecture
 * so later phases slot in without a rewrite:
 *   - `confidence` is modelled as UNCERTAINTY (0 = certain, 1 = unknown), never
 *     as a score multiplier — low certainty widens the draw band, it does not
 *     reward weak arguments.
 *   - `evidence` is a SEMANTIC descriptor (relevance/credibility/support),
 *     never a raw count — quality dominates quantity.
 *   - `worldModel` is a reserved slot the downstream modules will enrich.
 */

/** Bump when the fusion contract changes; recorded on every trace. */
export const FUSION_LAYER_VERSION = "fusion-1.0.0-scaffold";

export type FusionSource =
  | "heuristic-anchor"
  | "conversation-graph"
  | "nlp"
  | "memory"
  | "retrieval"
  | "reasoning"
  | "planner"
  | "personality"
  | "critic"
  | "safety";

export type FusionMode = "additive" | "multiplicative" | "corrective" | "anchor";

/** Semantic (not numeric) evidence descriptor — populated Phase 2+. */
export interface SemanticEvidence {
  descriptor: string;
  relevance: number; // 0..1 — how on-point
  credibility: number; // 0..1 — how trustworthy the source of the claim is
  contextualSupport: number; // 0..1 — how well the surrounding conversation backs it
  contradictionResistance: number; // 0..1 — survives counter-evidence
  explanatoryValue: number; // 0..1 — how much it explains the outcome
}

export interface ScoredContribution {
  source: FusionSource;
  category: keyof CategoryScores;
  value: number; // 0..100 — the value this source argues for
  earnedWeight: number; // 0..1 — Phase 1: anchor=1, all others 0
  /** Uncertainty about this contribution (0 = certain, 1 = unknown). NOT a booster. */
  uncertainty: number;
  mode: FusionMode;
  reason: string;
  evidence?: SemanticEvidence[];
}

export interface FusedCategory {
  category: keyof CategoryScores;
  fusedValue: number; // 0..100
  /** Aggregate uncertainty for this category (drives verdict draw-band, not score). */
  uncertainty: number;
  contributions: ScoredContribution[];
}

/** The 15 scored categories, kept in lockstep with JudgeScore. */
export interface CategoryScores {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
  relevance: number;
  counterarguments: number;
  consistency: number;
  adaptability: number;
  confidence: number;
  audienceImpact: number;
  topicAdherence: number;
  conversationFlow: number;
  participation: number;
}

export interface SideFusion {
  categories: Record<keyof CategoryScores, FusedCategory>;
  /** Mean uncertainty across categories — later phases feed this into the draw band. */
  aggregateUncertainty: number;
}

export interface FusionTrace {
  version: string;
  /** Phase 1 is always true: fused output equals the heuristic input exactly. */
  passThrough: boolean;
  deterministic: true;
  creator: SideFusion;
  opponent: SideFusion;
  /** Reserved for the shared World Model the modules will enrich (Phase 2+). */
  worldModel?: unknown;
}

const CATEGORY_KEYS: (keyof CategoryScores)[] = [
  "creativity", "logic", "humor", "originality", "comeback", "entertainment",
  "relevance", "counterarguments", "consistency", "adaptability", "confidence",
  "audienceImpact", "topicAdherence", "conversationFlow", "participation",
];

/** Categories the conversation graph adjusts today — recorded for provenance only. */
const GRAPH_ADJUSTED: Set<keyof CategoryScores> = new Set([
  "comeback", "counterarguments", "originality", "creativity", "conversationFlow", "audienceImpact",
]);

function num(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildSide(scores: Partial<CategoryScores>): SideFusion {
  const categories = {} as Record<keyof CategoryScores, FusedCategory>;
  for (const category of CATEGORY_KEYS) {
    const value = num(scores[category]);
    const contributions: ScoredContribution[] = [
      {
        source: "heuristic-anchor",
        category,
        value,
        earnedWeight: 1, // Phase 1: the anchor carries the whole (identity) fusion.
        uncertainty: 0,
        mode: "anchor",
        reason: GRAPH_ADJUSTED.has(category)
          ? "Phase 1 pass-through: heuristic base score, already refined by the conversation graph."
          : "Phase 1 pass-through: heuristic base score.",
      },
    ];
    categories[category] = { category, fusedValue: value, uncertainty: 0, contributions };
  }
  return { categories, aggregateUncertainty: 0 };
}

/**
 * Phase 1 fusion: records provenance for both sides and returns fused values
 * identical to the inputs. Callers must continue to compute the winner from
 * the same score objects they already hold — this function only observes.
 */
export function buildPassThroughFusion(
  creatorScores: Partial<CategoryScores>,
  opponentScores: Partial<CategoryScores>
): FusionTrace {
  return {
    version: FUSION_LAYER_VERSION,
    passThrough: true,
    deterministic: true,
    creator: buildSide(creatorScores),
    opponent: buildSide(opponentScores),
  };
}
