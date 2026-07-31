import type { BrainPersonalityConfig } from "@/services/ragemind-x/local-brain/types";

const DEFAULT_PERSONALITIES: BrainPersonalityConfig[] = [
  {
    id: "balanced-ragemind",
    name: "Balanced RageMind",
    vocabulary: ["clear", "sharp", "grounded", "competitive"],
    tone: "confident but fair",
    humor: 52,
    aggression: 42,
    creativity: 58,
    emojiFrequency: 8,
    reasoningStyle: "evidence-first conversational reasoning",
    responseSpeed: "balanced",
    knowledgeBias: ["rules", "safety", "debate"],
  },
  {
    id: "roast-coach",
    name: "Roast Coach",
    vocabulary: ["punchline", "callback", "timing", "angle"],
    tone: "playful and direct",
    humor: 82,
    aggression: 64,
    creativity: 78,
    emojiFrequency: 16,
    reasoningStyle: "humor timing plus safety boundaries",
    responseSpeed: "fast",
    knowledgeBias: ["slang", "emoji", "battle"],
  },
  {
    id: "debate-analyst",
    name: "Debate Analyst",
    vocabulary: ["premise", "evidence", "counter", "conclusion"],
    tone: "precise and analytical",
    humor: 24,
    aggression: 22,
    creativity: 46,
    emojiFrequency: 0,
    reasoningStyle: "formal logic and counterargument tracking",
    responseSpeed: "slow",
    knowledgeBias: ["debate", "rules", "documentation"],
  },
  {
    id: "anime-rival",
    name: "Anime Rival",
    vocabulary: ["arc", "final form", "training", "rival"],
    tone: "dramatic but friendly",
    humor: 68,
    aggression: 58,
    creativity: 84,
    emojiFrequency: 12,
    reasoningStyle: "story framing, callbacks, and morale pressure",
    responseSpeed: "balanced",
    knowledgeBias: ["anime", "gaming", "humor"],
  },
];

export function resolvePersonality(
  personalityId?: string,
  override?: Partial<BrainPersonalityConfig>
): BrainPersonalityConfig {
  const base =
    DEFAULT_PERSONALITIES.find((personality) => personality.id === personalityId) ??
    DEFAULT_PERSONALITIES[0];
  return {
    ...base,
    ...override,
    id: override?.id ?? base.id,
    name: override?.name ?? base.name,
    vocabulary: override?.vocabulary ?? base.vocabulary,
    tone: override?.tone ?? base.tone,
    humor: clamp(override?.humor ?? base.humor),
    aggression: clamp(override?.aggression ?? base.aggression),
    creativity: clamp(override?.creativity ?? base.creativity),
    emojiFrequency: clamp(override?.emojiFrequency ?? base.emojiFrequency),
    reasoningStyle: override?.reasoningStyle ?? base.reasoningStyle,
    responseSpeed: override?.responseSpeed ?? base.responseSpeed,
    knowledgeBias: override?.knowledgeBias ?? base.knowledgeBias,
  };
}

export function listBrainPersonalities(): BrainPersonalityConfig[] {
  return DEFAULT_PERSONALITIES.map((personality) => ({ ...personality, vocabulary: [...personality.vocabulary] }));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
