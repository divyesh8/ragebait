import type { BattleSide, RageMindInput } from "@/services/rageMind";

export type FallacyType =
  | "false_dilemma"
  | "strawman"
  | "ad_hominem"
  | "circular_reasoning"
  | "appeal_to_emotion"
  | "appeal_to_authority"
  | "slippery_slope"
  | "red_herring";

export interface LogicSignal {
  messageIndex: number;
  side: BattleSide;
  username: string;
  type: FallacyType | "strong_reasoning";
  explanation: string;
  severity: number;
}

export interface HumanLogicAnalysis {
  signals: LogicSignal[];
  perSideScore: Record<BattleSide, number>;
  strongestReasoning: string;
  weakestReasoning: string;
  summary: string;
}

const FALLACY_RULES: { type: FallacyType; pattern: RegExp; explanation: string; severity: number }[] = [
  { type: "false_dilemma", pattern: /\b(either .* or|only two options|with us or against us)\b/i, explanation: "reduces the situation to fewer choices than likely exist", severity: 16 },
  { type: "strawman", pattern: /\b(so you are saying|you think everyone|you basically said)\b/i, explanation: "may exaggerate or reframe the opponent's claim", severity: 14 },
  { type: "ad_hominem", pattern: /\b(idiot|moron|clown|dumb|stupid)\b/i, explanation: "attacks the person more than the point", severity: 13 },
  { type: "circular_reasoning", pattern: /\b(because it is|that's true because|it just is)\b/i, explanation: "restates the claim instead of supporting it", severity: 15 },
  { type: "appeal_to_emotion", pattern: /\b(real fans|everyone will hate|think of|heartless|betray)\b/i, explanation: "leans on emotional pressure more than evidence", severity: 11 },
  { type: "appeal_to_authority", pattern: /\b(experts say|my teacher said|influencers know|famous people)\b/i, explanation: "leans on authority without showing the reasoning", severity: 10 },
  { type: "slippery_slope", pattern: /\b(if this happens.*then.*everything|next thing you know|will lead to)\b/i, explanation: "predicts a chain reaction without support", severity: 12 },
  { type: "red_herring", pattern: /\b(anyway|forget that|besides the point|what about)\b/i, explanation: "may redirect away from the core issue", severity: 10 },
];

export function analyzeHumanLogic(input: RageMindInput): HumanLogicAnalysis {
  const signals = input.messages.flatMap((message, index) => {
    const fallacies: LogicSignal[] = FALLACY_RULES.filter((rule) => rule.pattern.test(message.content)).map((rule) => ({
      messageIndex: index,
      side: message.side,
      username: message.username,
      type: rule.type,
      explanation: rule.explanation,
      severity: rule.severity,
    }));
    if (/\b(because|therefore|evidence|for example|the reason|that means|source|data)\b/i.test(message.content)) {
      fallacies.push({
        messageIndex: index,
        side: message.side,
        username: message.username,
        type: "strong_reasoning",
        explanation: "connects a claim to evidence, cause, or example",
        severity: 0,
      });
    }
    return fallacies;
  });

  const perSideScore = {
    creator: scoreSide(input, signals, "creator"),
    opponent: scoreSide(input, signals, "opponent"),
  };
  const strong = strongestReasoning(input);
  const weak = weakestReasoning(input, signals);

  return {
    signals,
    perSideScore,
    strongestReasoning: strong,
    weakestReasoning: weak,
    summary: summarize(perSideScore, signals),
  };
}

function scoreSide(input: RageMindInput, signals: LogicSignal[], side: BattleSide): number {
  const sideText = input.messages.filter((message) => message.side === side).map((message) => message.content).join(" ");
  const evidenceHits = hits(sideText, /\b(because|therefore|evidence|example|reason|logic|data|source)\b/gi);
  const fallacyPenalty = signals
    .filter((signal) => signal.side === side && signal.type !== "strong_reasoning")
    .reduce((sum, signal) => sum + signal.severity, 0);
  return clamp(48 + evidenceHits * 12 - fallacyPenalty);
}

function strongestReasoning(input: RageMindInput): string {
  const best = [...input.messages].sort((a, b) => reasoningScore(b.content) - reasoningScore(a.content))[0];
  return best ? `${best.username}, round ${best.round}: "${truncate(best.content, 180)}"` : "";
}

function weakestReasoning(input: RageMindInput, signals: LogicSignal[]): string {
  const severe = signals.filter((signal) => signal.type !== "strong_reasoning").sort((a, b) => b.severity - a.severity)[0];
  if (severe) {
    const message = input.messages[severe.messageIndex];
    return `${severe.username}, round ${message?.round ?? "?"}: ${severe.explanation}.`;
  }
  const weakest = [...input.messages].sort((a, b) => reasoningScore(a.content) - reasoningScore(b.content))[0];
  return weakest ? `${weakest.username}, round ${weakest.round}: thin reasoning signal.` : "";
}

function reasoningScore(content: string): number {
  return hits(content, /\b(because|therefore|evidence|example|reason|logic|data|source)\b/gi) * 14 + Math.min(24, content.length / 12);
}

function summarize(perSideScore: Record<BattleSide, number>, signals: LogicSignal[]): string {
  const fallacies = signals.filter((signal) => signal.type !== "strong_reasoning").length;
  const leader = perSideScore.creator >= perSideScore.opponent ? "creator" : "opponent";
  return `${leader} has the stronger human-logic score; ${fallacies} fallacy signal${fallacies === 1 ? "" : "s"} should be penalized if they weaken the actual point.`;
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
