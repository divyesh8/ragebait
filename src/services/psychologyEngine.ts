import type { RageMindInput } from "@/services/rageMind";

export interface PsychologyAnalysis {
  pressureSignals: string[];
  mindGames: string[];
  confidenceShifts: string[];
  argumentCollapse: string[];
  recoveryMoments: string[];
}

export function analyzePsychology(input: RageMindInput): PsychologyAnalysis {
  const messages = input.messages;
  const pressureSignals = messages
    .filter((m) => /\b(answer|explain|caught|exposed|still waiting|cope)\b/i.test(m.content))
    .map((m) => `${m.username} applied pressure in round ${m.round}.`);
  const mindGames = messages
    .filter((m) => /\b(scared|nervous|you know|admit|bluff)\b/i.test(m.content))
    .map((m) => `${m.username} may be using mind-game framing in round ${m.round}.`);
  const argumentCollapse = messages
    .filter((m) => /\b(ignore|ignored|contradict|contradiction|no answer)\b/i.test(m.content))
    .map((m) => `${m.username} flagged a possible collapse or contradiction in round ${m.round}.`);

  return {
    pressureSignals,
    mindGames,
    confidenceShifts: inferConfidenceShifts(input),
    argumentCollapse,
    recoveryMoments: inferRecovery(input),
  };
}

function inferConfidenceShifts(input: RageMindInput): string[] {
  const lastRound = Math.max(0, ...input.messages.map((m) => m.round));
  if (lastRound < 2) return [];
  return input.messages
    .filter((m) => m.round === lastRound && /\b(clearly|easy|actually|still|watch)\b/i.test(m.content))
    .map((m) => `${m.username} finished with visible confidence in round ${m.round}.`);
}

function inferRecovery(input: RageMindInput): string[] {
  return input.messages
    .filter((m) => /\b(but|actually|even if|still|that proves)\b/i.test(m.content))
    .map((m) => `${m.username} attempted a recovery or reframing move in round ${m.round}.`)
    .slice(0, 4);
}
