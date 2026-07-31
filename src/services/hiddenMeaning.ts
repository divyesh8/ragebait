import type { BattleSide, RageMindInput } from "@/services/rageMind";
import type { FusedMessageContext } from "@/services/contextFusion";

export type HiddenMeaningType =
  | "indirect_insult"
  | "backhand_compliment"
  | "passive_aggression"
  | "hidden_joke"
  | "layered_humor"
  | "double_meaning"
  | "symbolic_language";

export interface HiddenMeaningSignal {
  messageIndex: number;
  side: BattleSide;
  username: string;
  type: HiddenMeaningType;
  meaning: string;
  confidence: number;
}

export interface HiddenMeaningAnalysis {
  signals: HiddenMeaningSignal[];
  bySide: Record<BattleSide, HiddenMeaningSignal[]>;
  summary: string;
}

const RULES: { type: HiddenMeaningType; pattern: RegExp; meaning: string; confidence: number }[] = [
  {
    type: "backhand_compliment",
    pattern: /\b(not bad for|good try|at least you|cute attempt|almost made sense)\b/i,
    meaning: "Praise is likely being used to lower the opponent's status.",
    confidence: 82,
  },
  {
    type: "passive_aggression",
    pattern: /\b(sure|whatever|if you say so|bless|nice one|great job)\b/i,
    meaning: "Surface agreement may hide dismissal or mockery.",
    confidence: 72,
  },
  {
    type: "indirect_insult",
    pattern: /\b(some people|imagine being|could never be me|NPC|main character)\b/i,
    meaning: "The line attacks indirectly by implying the opponent fits the negative example.",
    confidence: 78,
  },
  {
    type: "hidden_joke",
    pattern: /\b(inside joke|you had to be there|iykyk|real ones know)\b/i,
    meaning: "Meaning depends on shared audience knowledge or implied context.",
    confidence: 76,
  },
  {
    type: "layered_humor",
    pattern: /\b(ironically|the joke is|plot twist|meta|parody)\b/i,
    meaning: "Humor depends on a second layer beyond the literal words.",
    confidence: 80,
  },
  {
    type: "double_meaning",
    pattern: /\b(cooked|fire|dead|killed|smoked|served|ate)\b/i,
    meaning: "Likely figurative battle language, not literal harm.",
    confidence: 74,
  },
  {
    type: "symbolic_language",
    pattern: /\b(chess|checkmate|mirror|mask|crown|throne|NPC|script)\b/i,
    meaning: "Uses symbolic status or strategy language to frame the battle.",
    confidence: 70,
  },
];

export function detectHiddenMeaning(input: RageMindInput, fusedMessages: FusedMessageContext[] = []): HiddenMeaningAnalysis {
  const signals = input.messages.flatMap((message, index) =>
    RULES.filter((rule) => rule.pattern.test(message.content)).map((rule) => ({
      messageIndex: index,
      side: message.side,
      username: message.username,
      type: rule.type,
      meaning: addContext(rule.meaning, fusedMessages[index]),
      confidence: rule.confidence,
    }))
  );

  const bySide = {
    creator: signals.filter((signal) => signal.side === "creator"),
    opponent: signals.filter((signal) => signal.side === "opponent"),
  };

  return {
    signals,
    bySide,
    summary: signals.length
      ? `${signals.length} hidden-meaning signal${signals.length === 1 ? "" : "s"} detected across sarcasm, symbolic language, or indirect framing.`
      : "No strong hidden-meaning signal detected; judge mostly from literal context and conversation flow.",
  };
}

function addContext(meaning: string, fused?: FusedMessageContext): string {
  if (!fused?.replyTo) return meaning;
  return `${meaning} It appears in reply context from ${fused.replyTo}.`;
}
