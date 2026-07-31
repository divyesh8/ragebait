import type { BattleSide, RageMindInput, RageMindMessage } from "@/services/rageMind";

export type EmotionalState = "calm" | "angry" | "confident" | "defensive" | "funny" | "serious" | "respectful" | "toxic";

export interface EmotionalTransition {
  side: BattleSide;
  username: string;
  from: EmotionalState;
  to: EmotionalState;
  round: number;
  reason: string;
}

export interface EmotionTransitionAnalysis {
  timeline: Record<BattleSide, { round: number; state: EmotionalState; intensity: number; content: string }[]>;
  transitions: EmotionalTransition[];
  perSideStability: Record<BattleSide, number>;
  summary: string;
}

export function analyzeEmotionTransitions(input: RageMindInput): EmotionTransitionAnalysis {
  const timeline = {
    creator: buildTimeline(input, "creator"),
    opponent: buildTimeline(input, "opponent"),
  };
  const transitions = [...findTransitions(input, "creator", timeline.creator), ...findTransitions(input, "opponent", timeline.opponent)];
  const perSideStability = {
    creator: stabilityScore(timeline.creator, transitions.filter((transition) => transition.side === "creator").length),
    opponent: stabilityScore(timeline.opponent, transitions.filter((transition) => transition.side === "opponent").length),
  };

  return {
    timeline,
    transitions,
    perSideStability,
    summary: summarize(transitions, perSideStability),
  };
}

function buildTimeline(input: RageMindInput, side: BattleSide) {
  return input.messages
    .filter((message) => message.side === side)
    .map((message) => ({
      round: message.round,
      state: classifyState(message),
      intensity: scoreIntensity(message.content),
      content: truncate(message.content, 120),
    }));
}

function findTransitions(
  input: RageMindInput,
  side: BattleSide,
  timeline: { round: number; state: EmotionalState; intensity: number; content: string }[]
): EmotionalTransition[] {
  const username = input.players.find((player) => player.side === side)?.username ?? side;
  const transitions: EmotionalTransition[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const previous = timeline[i - 1];
    const current = timeline[i];
    if (previous.state !== current.state) {
      transitions.push({
        side,
        username,
        from: previous.state,
        to: current.state,
        round: current.round,
        reason: `Shift from "${previous.content}" to "${current.content}".`,
      });
    }
  }
  return transitions;
}

function classifyState(message: RageMindMessage): EmotionalState {
  const content = message.content;
  if (/\b(kill yourself|slur|hate all|die)\b/i.test(content)) return "toxic";
  if (/\b(respect|gg|fair|valid|good point)\b/i.test(content)) return "respectful";
  if (/\b(angry|mad|trash|nonsense|shut|cope|cry)\b/i.test(content)) return "angry";
  if (/\b(no i|actually|but|defend|not what i said|you twisted)\b/i.test(content)) return "defensive";
  if (/\b(clearly|obvious|easy|watch|no cap|i know)\b/i.test(content)) return "confident";
  if (/\b(lol|haha|meme|joke|wild|skibidi|bro)\b/i.test(content)) return "funny";
  if (/\b(evidence|logic|because|therefore|serious|point)\b/i.test(content)) return "serious";
  return "calm";
}

function scoreIntensity(content: string): number {
  let score = 28;
  score += Math.min(22, (content.match(/[!?]/g)?.length ?? 0) * 5);
  score += hits(content, /\b(cooked|destroy|trash|angry|cope|cry|clearly|obvious)\b/gi) * 8;
  return clamp(score);
}

function stabilityScore(
  timeline: { round: number; state: EmotionalState; intensity: number; content: string }[],
  transitionCount: number
): number {
  const averageIntensity = timeline.reduce((sum, item) => sum + item.intensity, 0) / Math.max(timeline.length, 1);
  return clamp(78 - transitionCount * 12 - Math.max(0, averageIntensity - 55) * 0.4);
}

function summarize(transitions: EmotionalTransition[], stability: Record<BattleSide, number>): string {
  if (!transitions.length) return "No major emotional transition detected; tone stays relatively stable.";
  const biggest = transitions[0];
  const steadier = stability.creator >= stability.opponent ? "creator" : "opponent";
  return `Key emotional shift: ${biggest.username} moved ${biggest.from} to ${biggest.to} around round ${biggest.round}; ${steadier} stayed more emotionally stable.`;
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
