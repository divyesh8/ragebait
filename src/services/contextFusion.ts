import type { BattleSide, RageMindInput, RageMindMessage } from "@/services/rageMind";
import type { IntentAnalysis, IntentLabel } from "@/services/intentEngine";

export interface FusedMessageContext {
  messageIndex: number;
  side: BattleSide;
  username: string;
  round: number;
  content: string;
  inheritedTopic: string;
  battleFrame: string;
  previousSpeaker?: string;
  previousMessage?: string;
  replyTo?: string;
  recentContext: string[];
  likelyIntent?: IntentLabel;
  callbackSignals: string[];
}

export interface ContextFusionAnalysis {
  battleContext: {
    title: string;
    topic: string;
    battleType: string;
    mode: string;
    players: string[];
  };
  fusedMessages: FusedMessageContext[];
  conversationDirection: string;
  keyCarryForward: string[];
}

export function fuseConversationContext(input: RageMindInput, intent?: IntentAnalysis): ContextFusionAnalysis {
  const fusedMessages = input.messages.map((message, index) => fuseMessage(input, message, index, intent));
  const direction = inferDirection(input, fusedMessages);

  return {
    battleContext: {
      title: input.title,
      topic: input.topic,
      battleType: input.battleType ?? "casual",
      mode: input.mode ?? "text",
      players: input.players.map((player) => player.username),
    },
    fusedMessages,
    conversationDirection: direction,
    keyCarryForward: buildCarryForward(input, fusedMessages, direction),
  };
}

function fuseMessage(
  input: RageMindInput,
  message: RageMindMessage,
  index: number,
  intent?: IntentAnalysis
): FusedMessageContext {
  const previous = input.messages[index - 1];
  const previousOpponent = [...input.messages.slice(0, index)].reverse().find((item) => item.side !== message.side);
  const recentContext = input.messages
    .slice(Math.max(0, index - 3), index)
    .map((item) => `${item.username}: ${truncate(item.content, 120)}`);
  const callbackSignals = findCallbacks(message.content, previous, previousOpponent);

  return {
    messageIndex: index,
    side: message.side,
    username: message.username,
    round: message.round,
    content: message.content,
    inheritedTopic: input.topic,
    battleFrame: `${input.title} | ${input.battleType ?? "casual"} ${input.mode ?? "text"} battle`,
    previousSpeaker: previous?.username,
    previousMessage: previous?.content,
    replyTo: previousOpponent ? `${previousOpponent.username}, round ${previousOpponent.round}` : undefined,
    recentContext,
    likelyIntent: intent?.messages[index]?.primaryIntent,
    callbackSignals,
  };
}

function findCallbacks(content: string, previous?: RageMindMessage, previousOpponent?: RageMindMessage): string[] {
  const signals: string[] = [];
  if (/\b(you said|earlier|again|that point|your point|still)\b/i.test(content)) {
    signals.push("Explicit callback to an earlier claim.");
  }
  if (previousOpponent && lexicalOverlap(content, previousOpponent.content) > 0.18) {
    signals.push(`Likely replying to ${previousOpponent.username}'s previous message.`);
  }
  if (previous && /\b(but|actually|even if|so)\b/i.test(content)) {
    signals.push(`Continues or reframes the prior turn from ${previous.username}.`);
  }
  return signals;
}

function inferDirection(input: RageMindInput, fusedMessages: FusedMessageContext[]): string {
  const questions = input.messages.filter((message) => message.content.includes("?")).length;
  const callbacks = fusedMessages.flatMap((message) => message.callbackSignals).length;
  const topicHits = input.messages.filter((message) => message.content.toLowerCase().includes(input.topic.toLowerCase())).length;
  if (callbacks >= Math.max(2, input.messages.length / 3)) return "Adaptive back-and-forth with visible callbacks and rebuttals.";
  if (questions >= 2) return "Pressure-oriented exchange where questions and forced answers shape the flow.";
  if (topicHits === 0 && input.messages.length >= 4) return "Topic is drifting away from the battle frame and into personal or generic attacks.";
  return "Linear exchange where each message should inherit the battle topic and recent turn context.";
}

function buildCarryForward(input: RageMindInput, fusedMessages: FusedMessageContext[], direction: string): string[] {
  const carryForward = [
    `Title and topic remain active context: ${input.title} / ${input.topic}.`,
    direction,
  ];
  const latestCallbacks = fusedMessages.flatMap((message) => message.callbackSignals).slice(-3);
  return [...carryForward, ...latestCallbacks].slice(0, 6);
}

function lexicalOverlap(a: string, b: string): number {
  const aWords = new Set(normalize(a).split(/\s+/).filter((word) => word.length > 3));
  const bWords = normalize(b).split(/\s+/).filter((word) => word.length > 3);
  if (!aWords.size || !bWords.length) return 0;
  return bWords.filter((word) => aWords.has(word)).length / Math.max(bWords.length, 1);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
