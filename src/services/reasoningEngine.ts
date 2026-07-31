import type { RageMindInput } from "@/services/rageMind";

export interface ReasoningAnalysis {
  reasoning: string;
  evidence: string[];
  ignoredQuestions: string[];
  repeatedArguments: string[];
  contradictions: string[];
}

export function analyzeReasoning(input: RageMindInput): ReasoningAnalysis {
  return {
    reasoning: "Evaluate the verdict from the full transcript: direct rebuttals, topic fit, callbacks, originality, and endgame momentum.",
    evidence: input.messages.slice(0, 6).map((m) => `${m.username}, round ${m.round}: "${truncate(m.content, 140)}"`),
    ignoredQuestions: findIgnoredQuestions(input),
    repeatedArguments: findRepeatedArguments(input),
    contradictions: findContradictions(input),
  };
}

function findIgnoredQuestions(input: RageMindInput): string[] {
  const questions = input.messages.filter((m) => m.content.includes("?"));
  return questions.slice(0, 3).map((m) => `${m.username} asked a question in round ${m.round}; check whether the opponent answered it.`);
}

function findRepeatedArguments(input: RageMindInput): string[] {
  const notes: string[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const normalized = input.messages
      .filter((m) => m.side === side)
      .map((m) => m.content.toLowerCase().replace(/[^a-z0-9\s]/g, "").slice(0, 36));
    if (new Set(normalized).size < normalized.length) notes.push(`${side} repeated similar phrasing across rounds.`);
  }
  return notes;
}

function findContradictions(input: RageMindInput): string[] {
  return input.messages
    .filter((m) => /\b(contradict|but earlier|you said|opposite)\b/i.test(m.content))
    .map((m) => `${m.username} flagged a contradiction in round ${m.round}.`);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
