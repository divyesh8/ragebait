import type { BattleSide, RageMindInput } from "@/services/rageMind";

export type HumorStyle = "dark" | "dry" | "satire" | "parody" | "irony" | "self_deprecating" | "wordplay" | "absurd";

export interface HumorSignal {
  messageIndex: number;
  side: BattleSide;
  username: string;
  style: HumorStyle;
  explanation: string;
  score: number;
  abusiveRisk: number;
}

export interface HumorDepthAnalysis {
  signals: HumorSignal[];
  perSideScore: Record<BattleSide, number>;
  bestHumor: string;
  abusiveContentWarning: string[];
  summary: string;
}

const HUMOR_RULES: { style: HumorStyle; pattern: RegExp; explanation: string; score: number }[] = [
  { style: "dark", pattern: /\b(dead|grave|funeral|crime scene|villain origin)\b/i, explanation: "uses dark exaggeration or bleak imagery", score: 58 },
  { style: "dry", pattern: /\b(sure|fine|noted|groundbreaking|how original)\b/i, explanation: "lands through understatement or deadpan tone", score: 54 },
  { style: "satire", pattern: /\b(society|capitalism|politics|system|satire)\b/i, explanation: "uses social commentary as the joke layer", score: 60 },
  { style: "parody", pattern: /\b(acting like|cosplay|roleplay|trailer voice|main character)\b/i, explanation: "imitates or exaggerates a familiar style", score: 63 },
  { style: "irony", pattern: /\b(ironic|plot twist|funny how|somehow)\b/i, explanation: "meaning flips against expectation", score: 62 },
  { style: "self_deprecating", pattern: /\b(i am cooked|i'm cooked|my bad|i roast myself|me too)\b/i, explanation: "takes status risk by making the self part of the joke", score: 64 },
  { style: "wordplay", pattern: /\b(pun|wordplay|double meaning|rhyme|bars)\b/i, explanation: "depends on language play or double meaning", score: 66 },
  { style: "absurd", pattern: /\b(skibidi|brainrot|ohio|npc|random|fever dream)\b/i, explanation: "uses absurd internet-humor logic", score: 56 },
];

export function analyzeHumorDepth(input: RageMindInput): HumorDepthAnalysis {
  const signals = input.messages.flatMap((message, index) =>
    HUMOR_RULES.filter((rule) => rule.pattern.test(message.content)).map((rule) => {
      const abusiveRisk = scoreAbusiveRisk(message.content);
      return {
        messageIndex: index,
        side: message.side,
        username: message.username,
        style: rule.style,
        explanation: rule.explanation,
        score: clamp(rule.score + styleBoost(message.content) - abusiveRisk * 0.35),
        abusiveRisk,
      };
    })
  );
  const perSideScore = {
    creator: scoreSide(input, signals, "creator"),
    opponent: scoreSide(input, signals, "opponent"),
  };
  const best = [...signals].sort((a, b) => b.score - a.score)[0];
  const abusiveContentWarning = signals
    .filter((signal) => signal.abusiveRisk >= 50)
    .map((signal) => `${signal.username}'s ${signal.style.replace(/_/g, " ")} may cross into abusive content; do not reward harm or hate.`);

  return {
    signals,
    perSideScore,
    bestHumor: best ? `${best.username}: ${best.style.replace(/_/g, " ")} (${best.score}/100)` : "No high-confidence humor style detected.",
    abusiveContentWarning,
    summary: summarize(perSideScore, abusiveContentWarning),
  };
}

function scoreSide(input: RageMindInput, signals: HumorSignal[], side: BattleSide): number {
  const sideSignals = signals.filter((signal) => signal.side === side);
  const text = input.messages.filter((message) => message.side === side).map((message) => message.content).join(" ");
  const directHumor = hits(text, /\b(lol|haha|meme|joke|wild|cooked|ratio|bro)\b/gi) * 7;
  const averageDepth = sideSignals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(sideSignals.length, 1);
  const abusivePenalty = sideSignals.reduce((sum, signal) => sum + signal.abusiveRisk, 0) / Math.max(sideSignals.length || 1, 1);
  return clamp(38 + directHumor + averageDepth * 0.45 - abusivePenalty * 0.25);
}

function styleBoost(content: string): number {
  let boost = 0;
  if (/[!?]/.test(content)) boost += 4;
  if (content.length < 90) boost += 5;
  if (/\b(you said|callback|earlier)\b/i.test(content)) boost += 8;
  return boost;
}

function scoreAbusiveRisk(content: string): number {
  let risk = 0;
  if (/\b(kill yourself|die|hurt you|slur|caste|race|religion)\b/i.test(content)) risk += 70;
  if (/\b(idiot|moron|stupid|dumb)\b/i.test(content)) risk += 18;
  if (/\b(body|family|illness|disability)\b/i.test(content)) risk += 18;
  return clamp(risk);
}

function summarize(perSideScore: Record<BattleSide, number>, abusiveWarnings: string[]): string {
  const leader = perSideScore.creator >= perSideScore.opponent ? "creator" : "opponent";
  if (abusiveWarnings.length) return `${leader} has stronger humor depth, but abusive-risk lines should be discounted.`;
  return `${leader} has stronger humor depth after accounting for style variety and timing.`;
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
