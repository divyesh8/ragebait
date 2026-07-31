import type { BattleSide, RageMindInput } from "@/services/rageMind";

export interface MomentumPoint {
  round: number;
  side: BattleSide;
  username: string;
  score: number;
  reason: string;
}

export interface ConversationFlowAnalysis {
  momentum: MomentumPoint[];
  topicDrift: string[];
  repeatingArguments: string[];
  contradictions: string[];
  pressure: string[];
  recovery: string[];
  loops: string[];
  summary: string;
}

export function analyzeConversationFlow(input: RageMindInput): ConversationFlowAnalysis {
  const momentum = input.messages.map((message) => ({
    round: message.round,
    side: message.side,
    username: message.username,
    score: scoreMomentum(message.content),
    reason: explainMomentum(message.content),
  }));
  const topicDrift = findTopicDrift(input);
  const repeatingArguments = findRepeats(input);
  const contradictions = findContradictions(input);
  const pressure = input.messages
    .filter((message) => /\b(answer|explain|caught|exposed|still waiting|admit|prove)\b/i.test(message.content))
    .map((message) => `${message.username} applied pressure in round ${message.round}.`);
  const recovery = input.messages
    .filter((message) => /\b(but|actually|even if|still|that proves|comeback)\b/i.test(message.content))
    .map((message) => `${message.username} attempted recovery or reframing in round ${message.round}.`);
  const loops = findLoops(input);

  return {
    momentum,
    topicDrift,
    repeatingArguments,
    contradictions,
    pressure,
    recovery,
    loops,
    summary: summarize(momentum, topicDrift, repeatingArguments, contradictions),
  };
}

function scoreMomentum(content: string): number {
  let score = Math.min(35, content.length / 5);
  if (/\b(because|therefore|evidence|logic|point)\b/i.test(content)) score += 18;
  if (/\b(lol|haha|cooked|ratio|wild|meme)\b/i.test(content)) score += 14;
  if (/\b(you said|earlier|actually|but|still)\b/i.test(content)) score += 16;
  if (/[!?]/.test(content)) score += 8;
  return clamp(35 + score);
}

function explainMomentum(content: string): string {
  if (/\b(you said|earlier|actually|but|still)\b/i.test(content)) return "built momentum through rebuttal or callback";
  if (/\b(because|therefore|evidence|logic|point)\b/i.test(content)) return "built momentum through reasoning";
  if (/\b(lol|haha|cooked|ratio|wild|meme)\b/i.test(content)) return "built momentum through humor or roast timing";
  return "baseline turn impact";
}

function findTopicDrift(input: RageMindInput): string[] {
  const topicWords = input.topic.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  if (!topicWords.length) return [];
  return input.messages
    .filter((message) => {
      const normalized = normalize(message.content);
      return !topicWords.some((word) => normalized.includes(word)) && message.round > 1 && message.content.length > 45;
    })
    .slice(0, 4)
    .map((message) => `${message.username}, round ${message.round}: possible topic drift from "${input.topic}".`);
}

function findRepeats(input: RageMindInput): string[] {
  const notes: string[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const sideMessages = input.messages.filter((message) => message.side === side);
    for (let i = 1; i < sideMessages.length; i++) {
      if (overlap(sideMessages[i - 1].content, sideMessages[i].content) > 0.48) {
        notes.push(`${sideMessages[i].username} repeated a similar argument around round ${sideMessages[i].round}.`);
      }
    }
  }
  return notes.slice(0, 5);
}

function findContradictions(input: RageMindInput): string[] {
  return input.messages
    .filter((message) => /\b(contradict|opposite|but earlier|you said|changed your point)\b/i.test(message.content))
    .map((message) => `${message.username} flagged or created a contradiction in round ${message.round}.`)
    .slice(0, 5);
}

function findLoops(input: RageMindInput): string[] {
  const normalized = input.messages.map((message) => normalize(message.content).split(/\s+/).filter((word) => word.length > 4).slice(0, 8).join(" "));
  const loops: string[] = [];
  for (let i = 2; i < normalized.length; i++) {
    if (overlap(normalized[i], normalized[i - 2]) > 0.55) {
      loops.push(`Conversation loop detected near round ${input.messages[i].round}; similar claims are returning without new evidence.`);
    }
  }
  return Array.from(new Set(loops)).slice(0, 3);
}

function summarize(
  momentum: MomentumPoint[],
  topicDrift: string[],
  repeatingArguments: string[],
  contradictions: string[]
): string {
  const leader = [...momentum].sort((a, b) => b.score - a.score)[0];
  const issues = topicDrift.length + repeatingArguments.length + contradictions.length;
  if (!leader) return "Not enough conversation to establish flow.";
  if (issues > 2) return `${leader.username} has the strongest momentum spike, but flow quality is reduced by drift, repetition, or contradiction.`;
  return `${leader.username} created the clearest momentum spike in round ${leader.round}; flow is usable for context-aware judging.`;
}

function overlap(a: string, b: string): number {
  const aWords = new Set(normalize(a).split(/\s+/).filter((word) => word.length > 3));
  const bWords = normalize(b).split(/\s+/).filter((word) => word.length > 3);
  if (!aWords.size || !bWords.length) return 0;
  return bWords.filter((word) => aWords.has(word)).length / Math.max(bWords.length, 1);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
