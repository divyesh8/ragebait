import type { BattleSide, RageMindInput, RageMindMessage } from "@/services/rageMind";

export type IntentLabel =
  | "question"
  | "challenge"
  | "roast"
  | "joke"
  | "threat"
  | "mocking"
  | "support"
  | "agreement"
  | "disagreement"
  | "trolling"
  | "provoking"
  | "manipulation"
  | "persuasion";

export interface IntentSignal {
  messageIndex: number;
  side: BattleSide;
  username: string;
  round: number;
  primaryIntent: IntentLabel;
  allIntents: IntentLabel[];
  confidence: number;
  explanation: string;
}

export interface IntentAnalysis {
  messages: IntentSignal[];
  dominantIntents: IntentLabel[];
  perSide: Record<BattleSide, IntentLabel[]>;
  conversationIntent: string;
}

const INTENT_RULES: { label: IntentLabel; pattern: RegExp; weight: number; explanation: string }[] = [
  { label: "question", pattern: /\?|(?:\b(why|what|how|when|where|who|explain|answer)\b)/i, weight: 12, explanation: "asks for information or forces an answer" },
  { label: "challenge", pattern: /\b(prove|try|show|beat|defend|answer this|come on|lets see|let's see)\b/i, weight: 16, explanation: "pushes the opponent to respond or prove a claim" },
  { label: "roast", pattern: /\b(cooked|roast|trash|clown|ratio|destroy|smoked|washed|sit down)\b/i, weight: 18, explanation: "attacks style, performance, or status in battle language" },
  { label: "joke", pattern: /\b(lol|lmao|haha|joke|meme|wild|skibidi|brainrot|bro)\b/i, weight: 14, explanation: "signals humor, meme framing, or playful exaggeration" },
  { label: "threat", pattern: /\b(kill you|hurt you|find you|beat you up|come to your|watch your back)\b/i, weight: 28, explanation: "could imply real-world harm rather than competitive banter" },
  { label: "mocking", pattern: /\b(sure bro|wow genius|nice logic|great logic|cry|cope|aww|cute)\b/i, weight: 17, explanation: "uses dismissive or sarcastic framing" },
  { label: "support", pattern: /\b(respect|good point|valid|fair|agree with you on|gg)\b/i, weight: 15, explanation: "acknowledges the opponent or de-escalates" },
  { label: "agreement", pattern: /\b(i agree|true|exactly|same|you are right|you're right)\b/i, weight: 14, explanation: "accepts or aligns with a point" },
  { label: "disagreement", pattern: /\b(nope|wrong|false|not true|actually|but|nah|disagree)\b/i, weight: 15, explanation: "rejects or reframes a claim" },
  { label: "trolling", pattern: /\b(triggered|bait|cry more|stay mad|u mad|problem\?)\b/i, weight: 17, explanation: "tries to provoke a reaction more than advance the topic" },
  { label: "provoking", pattern: /\b(scared|nervous|admit it|caught|exposed|still waiting)\b/i, weight: 16, explanation: "applies social pressure to force a reply" },
  { label: "manipulation", pattern: /\b(everyone knows|be honest|real ones know|you know you lost|only an idiot)\b/i, weight: 17, explanation: "frames the audience or opponent into accepting a premise" },
  { label: "persuasion", pattern: /\b(because|therefore|evidence|reason|logic|means|so you should)\b/i, weight: 16, explanation: "tries to convince through reasoning or cause and effect" },
];

export function analyzeIntent(input: RageMindInput): IntentAnalysis {
  const messages = input.messages.map((message, index) => classifyMessage(message, index));
  const perSide = {
    creator: dominantForSide(messages, "creator"),
    opponent: dominantForSide(messages, "opponent"),
  };
  const dominantIntents = topLabels(messages.flatMap((message) => message.allIntents), 5);

  return {
    messages,
    dominantIntents,
    perSide,
    conversationIntent: summarizeConversationIntent(dominantIntents, perSide),
  };
}

function classifyMessage(message: RageMindMessage, messageIndex: number): IntentSignal {
  const matched = INTENT_RULES
    .filter((rule) => rule.pattern.test(message.content))
    .sort((a, b) => b.weight - a.weight);
  const allIntents = matched.map((rule) => rule.label);
  const primaryIntent = allIntents[0] ?? inferDefaultIntent(message.content);
  const primaryRule = matched.find((rule) => rule.label === primaryIntent);
  const confidence = clamp(44 + matched.reduce((sum, rule) => sum + rule.weight, 0) + punctuationBoost(message.content));

  return {
    messageIndex,
    side: message.side,
    username: message.username,
    round: message.round,
    primaryIntent,
    allIntents: allIntents.length ? allIntents : [primaryIntent],
    confidence,
    explanation: primaryRule?.explanation ?? defaultExplanation(primaryIntent),
  };
}

function inferDefaultIntent(content: string): IntentLabel {
  const trimmed = content.trim();
  if (trimmed.endsWith("?")) return "question";
  if (trimmed.length < 24) return "roast";
  if (/\b(i think|my point|the point)\b/i.test(trimmed)) return "persuasion";
  return "challenge";
}

function defaultExplanation(label: IntentLabel): string {
  if (label === "question") return "asks for clarification or creates pressure";
  if (label === "persuasion") return "tries to move the audience toward a conclusion";
  return "keeps the competitive exchange moving";
}

function dominantForSide(messages: IntentSignal[], side: BattleSide): IntentLabel[] {
  return topLabels(messages.filter((message) => message.side === side).flatMap((message) => message.allIntents), 4);
}

function topLabels(labels: IntentLabel[], limit: number): IntentLabel[] {
  const counts = new Map<IntentLabel, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

function summarizeConversationIntent(dominant: IntentLabel[], perSide: Record<BattleSide, IntentLabel[]>): string {
  if (dominant.includes("threat")) {
    return "The exchange includes possible real-world threat intent and should be judged with safety context first.";
  }
  if (dominant.includes("roast") && dominant.includes("joke")) {
    return "The main intent is competitive roasting with humor and audience reaction as central signals.";
  }
  if (dominant.includes("persuasion") || dominant.includes("question")) {
    return "The main intent is argument pressure: players are trying to convince, expose, or force answers.";
  }
  if (perSide.creator.includes("support") || perSide.opponent.includes("support")) {
    return "The exchange mixes competition with some respect or acknowledgement.";
  }
  return "The exchange is primarily competitive challenge and response.";
}

function punctuationBoost(content: string): number {
  return Math.min(12, (content.match(/[!?]/g)?.length ?? 0) * 3);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
