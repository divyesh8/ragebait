import type { RageMindInput } from "@/services/rageMind";

export interface AudienceSimulation {
  biggestLaugh: string;
  mostSavageComeback: string;
  mostEmotionalReply: string;
  mostConvincingArgument: string;
  mostMemorableMoment: string;
  mostShareableLine: string;
  engagementScore: number;
}

export function simulateAudience(input: RageMindInput): AudienceSimulation {
  const ranked = [...input.messages].sort((a, b) => scoreLine(b.content) - scoreLine(a.content));
  const best = ranked[0];
  const bestLine = best ? `${best.username}: "${truncate(best.content, 120)}"` : "";
  const convincing = [...input.messages].sort((a, b) => logicScore(b.content) - logicScore(a.content))[0];
  const emotional = [...input.messages].sort((a, b) => emotionScore(b.content) - emotionScore(a.content))[0];
  const averageScore = input.messages.reduce((sum, m) => sum + scoreLine(m.content), 0) / Math.max(input.messages.length, 1);

  return {
    biggestLaugh: bestLine,
    mostSavageComeback: bestLine,
    mostEmotionalReply: emotional ? `${emotional.username}: "${truncate(emotional.content, 120)}"` : bestLine,
    mostConvincingArgument: convincing ? `${convincing.username}: "${truncate(convincing.content, 120)}"` : bestLine,
    mostMemorableMoment: bestLine,
    mostShareableLine: bestLine,
    engagementScore: clampScore(averageScore + ranked.length * 3),
  };
}

function scoreLine(content: string): number {
  let score = Math.min(45, content.length / 4);
  if (/\b(lol|haha|cook|cooked|ratio|wild|bro|macha|bhai|uno reverse|peak)\b/i.test(content)) score += 18;
  if (/\b(because|logic|point|evidence|therefore)\b/i.test(content)) score += 10;
  if (/[?!]/.test(content)) score += 5;
  return score;
}

function logicScore(content: string): number {
  return (content.match(/\b(because|logic|evidence|reason|therefore|point)\b/gi)?.length ?? 0) * 12 + content.length / 12;
}

function emotionScore(content: string): number {
  return (content.match(/\b(respect|angry|scared|embarrass|proud|excited|cope|cooked)\b/gi)?.length ?? 0) * 12 + (content.match(/[!?]/g)?.length ?? 0) * 4;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
