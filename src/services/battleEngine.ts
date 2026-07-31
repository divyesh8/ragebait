/**
 * Battle Arena Engine — Phase 1 (backend only).
 *
 * Transport-agnostic battle logic: pure functions over persisted rows. The
 * same EngineState is served over polling today (Async Relay) and can be
 * pushed over SSE/WebSockets later (Live Duel) without touching this file.
 *
 * ONE SOURCE OF TRUTH (architectural invariant):
 * Live momentum is computed by `evaluateBattleTranscript` — the exact
 * final-judge pipeline (RageMind → conversation graph → judge panel) run on
 * the partial transcript with no battleId, so no cache or memory writes.
 * There is no second scoring algorithm; the live estimate and the final
 * verdict can never drift because they are the same function.
 *
 * REASONING, NOT PRESENTATION (architectural invariant):
 * The engine describes WHAT HAPPENED in the conversation, never how it
 * should look. It emits semantic event identifiers only:
 *
 *     Battle Engine → Semantic Battle Events → Presentation Layer → FX
 *
 * The frontend decides that `strong_counter` renders as a shockwave today
 * and a hologram in a future theme. No animation, particle, audio, or
 * visual concept exists in this file.
 *
 * CONTROL, NOT HP:
 * The control axis (-100..+100) represents psychological control of the
 * battlefield — pressure, initiative, dominance. The UI renders RageMind's
 * control language, never raw numbers, and control is presentation/pacing
 * state only: the final verdict authority remains the full judge run at the
 * end of the battle.
 */

import { evaluateBattleTranscript, type JudgeInput, type JudgeResult } from "@/services/aiJudge";
import { buildConversationGraph } from "@/services/brainV2";

export const ARENA_ENGINE_VERSION = "arena-1.1.0";

export type BattleSideKey = "creator" | "opponent";

// ---------------------------------------------------------------------------
// Row shapes (subset of the battles / battle_messages tables the engine reads)
// ---------------------------------------------------------------------------

export interface ArenaBattleRow {
  id: string;
  created_by: string;
  opponent_id: string | null;
  rounds: number;
  status: string;
  current_turn: BattleSideKey | null;
  turn_deadline: string | null;
  turn_seconds: number | null;
  engine_version: string | null;
  /** Live control axis persisted on the battle (survives timeouts, which write no message row). */
  control_current?: number | null;
}

export interface ArenaStrikeRow {
  user_id: string;
  content: string;
  round: number;
  created_at?: string;
  control_after: number | null;
}

// ---------------------------------------------------------------------------
// Semantic battle events — WHAT happened, never how it looks
// ---------------------------------------------------------------------------

/**
 * Semantic event identifiers. These are conversation facts, not effects:
 *  - strong_counter:        the strike directly answered and dismantled the
 *                           opponent's previous attack.
 *  - callback:              the strike resurrected an earlier line and used it
 *                           against its author or as a payoff.
 *  - recycled_line:         the striker repeated their own earlier material.
 *  - decisive_argument:     the words moved control of the battle decisively
 *                           toward the striker.
 *  - effective_argument:    a solid contribution that kept or built pressure.
 *  - weak_argument:         the strike landed but barely affected the battle.
 *  - timeout_silence:       the clock ran out — an unanswered exchange
 *                           (referee ruling, not a scored strike).
 *  - contradiction_exposed: RESERVED — emitted once the Memory/Critic fusion
 *                           contributions land (Score Fusion Phase 2+).
 *  - evidence_supported:    RESERVED — emitted once retrieval-grounding lands
 *                           (Score Fusion Phase 2+).
 */
export type SemanticBattleEvent =
  | "strong_counter"
  | "callback"
  | "recycled_line"
  | "decisive_argument"
  | "effective_argument"
  | "weak_argument"
  | "timeout_silence"
  | "contradiction_exposed"
  | "evidence_supported";

export interface StrikeImpact {
  engineVersion: string;
  /** 0..100 — semantic intensity of the strike (how much it mattered). */
  magnitude: number;
  /** Control axis after this strike (-100 opponent dominates .. +100 creator dominates). */
  controlAfter: number;
  /** Signed change vs the previous control state (creator-positive axis). */
  controlShift: number;
  /** 0..100 — the judge pipeline's certainty about this evaluation (uncertainty signal, never a score booster). */
  confidence: number;
  /** Semantic events, strongest first. Presentation maps these to theme effects client-side. */
  semanticEvents: SemanticBattleEvent[];
  /** Deterministic RageMind commentator line — content (words), not rendering. */
  casterLine: string;
}

// ---------------------------------------------------------------------------
// Engine state (what every transport serves to clients)
// ---------------------------------------------------------------------------

export interface EngineState {
  engineVersion: string | null;
  /** false for legacy battles (engine_version IS NULL) — old flow applies. */
  engaged: boolean;
  phase: "waiting" | "combat" | "final-exchange" | "judging" | "complete";
  currentTurn: BattleSideKey | null;
  turnDeadline: string | null;
  turnSeconds: number;
  /** True when the current turn's clock has run out (lazy timeout — resolved by the next request). */
  deadlineExpired: boolean;
  strikes: Record<BattleSideKey, number>;
  roundsTotal: number;
  control: number;
  controlDescriptor: string;
}

export function isArenaBattle(battle: Pick<ArenaBattleRow, "engine_version">): boolean {
  return Boolean(battle.engine_version);
}

/** Whose turn opens the battle: the challenger (creator) throws first. */
export const OPENING_TURN: BattleSideKey = "creator";

export function deriveEngineState(
  battle: ArenaBattleRow,
  strikes: ArenaStrikeRow[],
  now: Date
): EngineState {
  const engaged = isArenaBattle(battle);
  const creatorStrikes = strikes.filter((s) => s.user_id === battle.created_by).length;
  const opponentStrikes = battle.opponent_id
    ? strikes.filter((s) => s.user_id === battle.opponent_id).length
    : 0;

  // battles.control_current is authoritative (it includes timeout rulings);
  // the last strike's control_after is the fallback for older arena rows.
  const lastControl =
    typeof battle.control_current === "number"
      ? battle.control_current
      : [...strikes].reverse().find((s) => typeof s.control_after === "number")?.control_after ?? 0;

  const bothDone = creatorStrikes >= battle.rounds && opponentStrikes >= battle.rounds;
  const onFinalExchange =
    !bothDone && creatorStrikes + opponentStrikes >= battle.rounds * 2 - 2;

  let phase: EngineState["phase"];
  if (battle.status === "waiting") phase = "waiting";
  else if (battle.status === "completed") phase = "complete";
  else if (battle.status === "judging" || battle.status === "pending_review" || bothDone) phase = "judging";
  else if (onFinalExchange) phase = "final-exchange";
  else phase = "combat";

  const deadlineExpired = Boolean(
    engaged &&
      phase !== "waiting" &&
      phase !== "judging" &&
      phase !== "complete" &&
      battle.turn_deadline &&
      new Date(battle.turn_deadline).getTime() <= now.getTime()
  );

  return {
    engineVersion: battle.engine_version,
    engaged,
    phase,
    currentTurn: battle.current_turn,
    turnDeadline: battle.turn_deadline,
    turnSeconds: battle.turn_seconds ?? 90,
    deadlineExpired,
    strikes: { creator: creatorStrikes, opponent: opponentStrikes },
    roundsTotal: battle.rounds,
    control: lastControl,
    controlDescriptor: describeControl(lastControl),
  };
}

/** After a strike by `justStruck`, whose turn is next and what is the new deadline. */
export function nextTurn(
  justStruck: BattleSideKey,
  turnSeconds: number,
  now: Date
): { currentTurn: BattleSideKey; turnDeadline: string } {
  return {
    currentTurn: justStruck === "creator" ? "opponent" : "creator",
    turnDeadline: new Date(now.getTime() + turnSeconds * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Control language — psychological control, never numbers
// ---------------------------------------------------------------------------

export function describeControl(control: number): string {
  const leader = control > 0 ? "creator" : "opponent";
  const magnitude = Math.abs(control);
  if (magnitude < 10) return "The arena is evenly matched.";
  if (magnitude < 35) return leader === "creator" ? "The challenger has the initiative." : "The defender has the initiative.";
  if (magnitude < 65) return leader === "creator" ? "The challenger controls the battlefield." : "The defender controls the battlefield.";
  return leader === "creator" ? "The defender is pinned on the defensive." : "The challenger is pinned on the defensive.";
}

// ---------------------------------------------------------------------------
// Strike resolution — the ONE judge, run live
// ---------------------------------------------------------------------------

export interface StrikeContext {
  topic: string;
  title: string;
  battleType?: string;
  mode?: string;
  creatorId: string;
  opponentId: string;
  creatorName: string;
  opponentName: string;
  /** Full transcript INCLUDING the new strike, in order. */
  messages: { user_id: string; content: string; round: number; created_at?: string }[];
  /** Control axis before this strike (last stored control_after, or 0). */
  previousControl: number;
}

/** Scale factor from judge total-difference (~0..40 realistic) to the -100..100 control axis. */
const CONTROL_SCALE = 3;
const clampControl = (v: number) => Math.max(-100, Math.min(100, Math.round(v)));

/**
 * Resolves a strike with the final judge's own pipeline (no battleId → pure,
 * no persistence inside the judge), then derives the semantic events by
 * diffing the judge's own conversation-graph before/after the strike.
 */
export async function resolveStrike(ctx: StrikeContext): Promise<StrikeImpact> {
  const judgeInput: JudgeInput = {
    topic: ctx.topic,
    title: ctx.title,
    battleType: ctx.battleType,
    mode: ctx.mode,
    creatorId: ctx.creatorId,
    opponentId: ctx.opponentId,
    creatorName: ctx.creatorName,
    opponentName: ctx.opponentName,
    messages: ctx.messages,
  };
  const snapshot: JudgeResult = await evaluateBattleTranscript(judgeInput);

  const controlAfter = clampControl(
    (snapshot.scores.creator.total - snapshot.scores.opponent.total) * CONTROL_SCALE
  );
  const controlShift = controlAfter - clampControl(ctx.previousControl);

  const striker = ctx.messages[ctx.messages.length - 1];
  const strikerSide: BattleSideKey = striker.user_id === ctx.creatorId ? "creator" : "opponent";
  const strikerName = strikerSide === "creator" ? ctx.creatorName : ctx.opponentName;

  const semanticEvents = detectSemanticEvents(ctx, strikerSide, controlShift);
  const magnitude = computeMagnitude(controlShift, semanticEvents);
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(snapshot.battleAnalysis.confidenceScore ?? snapshot.rageMind?.confidence.score ?? 60))
  );

  return {
    engineVersion: ARENA_ENGINE_VERSION,
    magnitude,
    controlAfter,
    controlShift,
    confidence,
    semanticEvents,
    casterLine: casterLine(strikerName, semanticEvents, controlAfter),
  };
}

/** Referee ruling when the clock runs out: an empty exchange, not a scored strike. */
export function resolveTimeout(
  timedOutSide: BattleSideKey,
  previousControl: number
): StrikeImpact {
  // Silence concedes a fixed sliver of initiative — a referee ruling for the
  // pacing of the match, deliberately small so words remain the only real weapon.
  const drift = timedOutSide === "creator" ? -8 : 8;
  const controlAfter = clampControl(previousControl + drift);
  return {
    engineVersion: ARENA_ENGINE_VERSION,
    magnitude: 0,
    controlAfter,
    controlShift: controlAfter - clampControl(previousControl),
    confidence: 100,
    semanticEvents: ["timeout_silence"],
    casterLine: "…and the clock runs out. RageMind notes the silence.",
  };
}

// ---------------------------------------------------------------------------
// Semantic event detection — graph diff (the judge's own graph primitive)
// ---------------------------------------------------------------------------

type GraphMessage = { side: BattleSideKey; content: string; round: number };

function toGraphMessages(ctx: StrikeContext): GraphMessage[] {
  return ctx.messages.map((m) => ({
    side: m.user_id === ctx.creatorId ? ("creator" as const) : ("opponent" as const),
    content: m.content,
    round: m.round,
  }));
}

function detectSemanticEvents(
  ctx: StrikeContext,
  strikerSide: BattleSideKey,
  controlShift: number
): SemanticBattleEvent[] {
  const withStrike = buildConversationGraph(toGraphMessages(ctx));
  const withoutStrike = buildConversationGraph(toGraphMessages(ctx).slice(0, -1));

  const after = withStrike.perSide[strikerSide];
  const before = withoutStrike.perSide[strikerSide];

  const events: SemanticBattleEvent[] = [];

  if (after.directCounters > before.directCounters) events.push("strong_counter");
  if (after.callbacks > before.callbacks) events.push("callback");
  if (after.reusedLines > before.reusedLines) events.push("recycled_line");

  // Direction-aware ground movement: did the striker's words move control
  // toward their own side, and by how much?
  const shiftTowardStriker = strikerSide === "creator" ? controlShift : -controlShift;
  if (!events.includes("recycled_line")) {
    if (shiftTowardStriker >= 12) events.push("decisive_argument");
    else if (shiftTowardStriker >= 4) events.push("effective_argument");
    else events.push("weak_argument");
  }

  return events;
}

function computeMagnitude(controlShift: number, events: SemanticBattleEvent[]): number {
  const recycled = events.includes("recycled_line");
  const base = Math.min(100, Math.abs(controlShift) * 6);
  const eventBonus = events.includes("strong_counter") ? 20 : events.includes("callback") ? 12 : 0;
  return recycled ? Math.min(18, base) : Math.min(100, Math.max(8, base + eventBonus));
}

// ---------------------------------------------------------------------------
// Deterministic caster lines — commentator CONTENT (words), not rendering
// ---------------------------------------------------------------------------

function casterLine(
  strikerName: string,
  events: SemanticBattleEvent[],
  controlAfter: number
): string {
  const primary = events[0] ?? "weak_argument";
  const control = describeControl(controlAfter);
  switch (primary) {
    case "strong_counter":
      return `${strikerName} takes the last attack apart piece by piece. ${control}`;
    case "callback":
      return `${strikerName} brings an earlier line back — and it lands harder the second time. ${control}`;
    case "recycled_line":
      return `${strikerName} reaches for the same material again… the arena has heard it before. ${control}`;
    case "decisive_argument":
      return `${strikerName} just changed the direction of this battle. ${control}`;
    case "effective_argument":
      return `${strikerName} keeps the pressure coming. ${control}`;
    case "timeout_silence":
      return `…and the clock runs out. RageMind notes the silence.`;
    default:
      return `${strikerName} swings — the battle barely moves. ${control}`;
  }
}
