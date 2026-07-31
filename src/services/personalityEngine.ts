import type { BattleSide, RageMindInput } from "@/services/rageMind";

export type PersonalityAnalysis = Record<BattleSide, string[]>;

const PERSONALITY_RULES: { label: string; pattern: RegExp }[] = [
  { label: "Funny", pattern: /\b(lol|haha|joke|meme|wild|skibidi|brainrot)\b/i },
  { label: "Aggressive", pattern: /\b(destroy|dead|cooked|ratio|trash|sit down)\b/i },
  { label: "Strategic", pattern: /\b(first|second|point|strategy|counter|because)\b/i },
  { label: "Logical", pattern: /\b(logic|evidence|reason|therefore|argument)\b/i },
  { label: "Creative", pattern: /\b(like|as if|imagine|metaphor|uno reverse)\b/i },
  { label: "Calm", pattern: /\b(fair|valid|let's|lets|actually)\b/i },
  { label: "Adaptive", pattern: /\b(you said|your point|earlier|again|callback)\b/i },
  { label: "Confident", pattern: /\b(clearly|obvious|watch|easy|no cap)\b/i },
];

export function analyzePersonality(input: RageMindInput): PersonalityAnalysis {
  return {
    creator: sideSignals(input, "creator"),
    opponent: sideSignals(input, "opponent"),
  };
}

function sideSignals(input: RageMindInput, side: BattleSide): string[] {
  const text = input.messages.filter((m) => m.side === side).map((m) => m.content).join(" ");
  return PERSONALITY_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}
