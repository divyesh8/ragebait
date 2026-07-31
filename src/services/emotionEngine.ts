import type { BattleSide, RageMindInput } from "@/services/rageMind";

export type EmotionAnalysis = Record<BattleSide, string[]>;

const EMOTION_RULES: { label: string; pattern: RegExp }[] = [
  { label: "Confidence", pattern: /\b(easy|watch|clearly|obvious|i know|destroy|cook|cooked)\b/i },
  { label: "Frustration", pattern: /\b(again|seriously|waste|nonsense|trash|bro+)\b/i },
  { label: "Humor", pattern: /\b(lol|haha|wild|meme|skibidi|brainrot|macha|bhai)\b/i },
  { label: "Arrogance", pattern: /\b(you cannot|you can't|too easy|sit down|cope)\b/i },
  { label: "Respect", pattern: /\b(gg|fair|good point|respect|valid)\b/i },
  { label: "Embarrassment", pattern: /\b(oops|my bad|caught|exposed)\b/i },
  { label: "Excitement", pattern: /[!]{2,}|\b(lets go|mass|peak|fire)\b/i },
];

export function analyzeEmotion(input: RageMindInput): EmotionAnalysis {
  return {
    creator: sideSignals(input, "creator"),
    opponent: sideSignals(input, "opponent"),
  };
}

function sideSignals(input: RageMindInput, side: BattleSide): string[] {
  const text = input.messages.filter((m) => m.side === side).map((m) => m.content).join(" ");
  return EMOTION_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}
