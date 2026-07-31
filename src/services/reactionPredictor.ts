import type { BattleSide, RageMindInput } from "@/services/rageMind";

export type HumanReaction = "laugh" | "agree" | "disagree" | "ignore" | "get_offended" | "respect" | "share" | "applaud";

export interface ReactionPrediction {
  messageIndex: number;
  side: BattleSide;
  username: string;
  reactions: HumanReaction[];
  audienceScore: number;
  explanation: string;
}

export interface ReactionPredictorAnalysis {
  messages: ReactionPrediction[];
  likelyOverallReactions: HumanReaction[];
  perSideAudienceScore: Record<BattleSide, number>;
  summary: string;
}

export function predictHumanReactions(input: RageMindInput): ReactionPredictorAnalysis {
  const messages = input.messages.map((message, index) => {
    const reactions = classifyReactions(message.content);
    const audienceScore = scoreAudience(message.content, reactions);
    return {
      messageIndex: index,
      side: message.side,
      username: message.username,
      reactions,
      audienceScore,
      explanation: explainReactions(reactions),
    };
  });
  const perSideAudienceScore = {
    creator: average(messages.filter((message) => message.side === "creator").map((message) => message.audienceScore)),
    opponent: average(messages.filter((message) => message.side === "opponent").map((message) => message.audienceScore)),
  };
  const likelyOverallReactions = topReactions(messages);

  return {
    messages,
    likelyOverallReactions,
    perSideAudienceScore,
    summary: summarize(perSideAudienceScore, likelyOverallReactions),
  };
}

function classifyReactions(content: string): HumanReaction[] {
  const reactions: HumanReaction[] = [];
  if (/\b(lol|haha|meme|wild|cooked|ratio|bro|pun|wordplay)\b/i.test(content)) reactions.push("laugh");
  if (/\b(because|evidence|true|valid|good point|exactly)\b/i.test(content)) reactions.push("agree");
  if (/\b(wrong|false|nah|nope|disagree|actually)\b/i.test(content)) reactions.push("disagree");
  if (/\b(respect|gg|fair|valid)\b/i.test(content)) reactions.push("respect");
  if (/\b(share|clip|viral|screenshot|bars|mic drop|checkmate)\b/i.test(content)) reactions.push("share");
  if (/\b(great|well played|clean|brilliant|genius)\b/i.test(content)) reactions.push("applaud");
  if (/\b(kill yourself|die|slur|caste|religion|race|hate all)\b/i.test(content)) reactions.push("get_offended");
  if (!reactions.length || content.trim().length < 12) reactions.push("ignore");
  return Array.from(new Set(reactions));
}

function scoreAudience(content: string, reactions: HumanReaction[]): number {
  let score = Math.min(28, content.length / 7);
  if (reactions.includes("laugh")) score += 22;
  if (reactions.includes("agree")) score += 16;
  if (reactions.includes("respect")) score += 14;
  if (reactions.includes("share")) score += 18;
  if (reactions.includes("applaud")) score += 12;
  if (reactions.includes("disagree")) score += 5;
  if (reactions.includes("ignore")) score -= 16;
  if (reactions.includes("get_offended")) score -= 24;
  if (/[!?]/.test(content)) score += 6;
  return clamp(35 + score);
}

function topReactions(messages: ReactionPrediction[]): HumanReaction[] {
  const counts = new Map<HumanReaction, number>();
  for (const message of messages) {
    for (const reaction of message.reactions) counts.set(reaction, (counts.get(reaction) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reaction]) => reaction);
}

function explainReactions(reactions: HumanReaction[]): string {
  if (reactions.includes("get_offended")) return "Some users may read this as crossing from roast into harm or hate.";
  if (reactions.includes("share")) return "The line has clip/share potential because it is punchy or decisive.";
  if (reactions.includes("laugh")) return "The line is likely to land as humor or roast timing.";
  if (reactions.includes("agree")) return "The line gives the audience a reason to agree.";
  if (reactions.includes("ignore")) return "The line may be too short, generic, or low-signal to move the room.";
  return "Mixed audience response expected.";
}

function summarize(perSideAudienceScore: Record<BattleSide, number>, reactions: HumanReaction[]): string {
  const leader = perSideAudienceScore.creator >= perSideAudienceScore.opponent ? "creator" : "opponent";
  return `${leader} is predicted to create stronger audience response; likely room reactions: ${reactions.join(", ")}.`;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
