/**
 * AI Moderator service — Phase 2 (audited + upgraded).
 *
 * Pure analysis only: no DB access, no HTTP-layer concerns. Given a
 * message and battle context, returns a three-tier verdict — ALLOW
 * (save as-is), WARN (save, but surface a warning), or BLOCK (never
 * persisted). The caller (the messages API route, via
 * `src/lib/moderationEnforcement.ts`) owns logging, escalation, and
 * rate limiting.
 *
 * Kept deliberately separate from the AI Judge (Phase 1) — no imports
 * between the two, no shared state.
 */

import { getModerationThresholds, type ModerationThresholds } from "@/services/ruleEngine";

export type ModerationAction = "ALLOW" | "WARN" | "BLOCK";

export type ModerationCategory =
  | "safe_roast"
  | "personal_attack"
  | "harassment"
  | "hate"
  | "threat"
  | "spam";

/** Which local layer produced the verdict. */
export type ModerationSource = "local" | "fallback";

export interface ModeratorContext {
  /** This user's other recent messages in the same battle, for flood/repeat detection. */
  recentMessages?: string[];
  /** Battle topic — lets the AI judge whether an attack is "on-topic" roasting or a non-sequitur personal attack. */
  battleTopic?: string;
  /** casual | ranked | friend | tournament | group | event */
  battleType?: string;
  /** text | image | meme */
  mode?: string;
  senderUsername?: string;
  opponentUsername?: string;
  /** Recent messages from BOTH sides, oldest to newest, for conversational context. */
  conversationHistory?: { username: string; content: string }[];
}

export interface ModerationVerdict {
  action: ModerationAction;
  category: ModerationCategory;
  reason: string;
  toxicity_score: number; // 0-100
  source: ModerationSource;
}

// =========================================================
// Public API
// =========================================================

export async function analyzeMessage(
  content: string,
  context: ModeratorContext = {}
): Promise<ModerationVerdict> {
  // Thresholds come from the rule engine (ai_rules) so founders can tune
  // moderation sensitivity without code changes; safe defaults apply if
  // the table is unreachable.
  const thresholds = await getModerationThresholds();

  // Local rules run first: instant, deterministic, and catch the clear-cut
  // cases (explicit threats, spam patterns, obvious personal attacks).
  const local = runLocalRules(content, context, thresholds);
  if (local) return local;

  // Fully self-developed AI: moderation is deterministic local rules plus
  // heuristic scoring — no external AI services, no API keys. Anything the
  // hard rules didn't catch goes through the heuristic pass, which errs
  // toward WARN rather than blanket-allowing.
  return runFallbackHeuristics(content, thresholds);
}

function allow(source: ModerationSource, toxicity = 0): ModerationVerdict {
  return { action: "ALLOW", category: "safe_roast", reason: "No issues detected.", toxicity_score: toxicity, source };
}

// =========================================================
// Local (deterministic) rules — always run first
// =========================================================

const BLOCK_PATTERNS: { pattern: RegExp; category: ModerationCategory; reason: string }[] = [
  {
    pattern: /\b(kill yourself|kys|go die|die in a fire)\b/i,
    category: "threat",
    reason: "Threats or self-harm encouragement are not allowed.",
  },
  {
    pattern: /\b(dox|doxx|home address|phone number|where you live)\b/i,
    category: "threat",
    reason: "Sharing or threatening someone's private information is not allowed.",
  },
  {
    pattern: /\b(rape|sexual assault)\b/i,
    category: "threat",
    reason: "Sexual violence content is not allowed in battles.",
  },
];

const WARN_PATTERNS: { pattern: RegExp; category: ModerationCategory; reason: string }[] = [
  {
    pattern: /\byou'?re\s+(so\s+)?(pathetic|worthless|disgusting|a\s+loser|trash|garbage)\b/i,
    category: "personal_attack",
    reason: "Keep attacks focused on arguments, not users.",
  },
  {
    pattern: /\b(shut up|nobody (likes|cares about) you|no one (likes|cares about) you)\b/i,
    category: "harassment",
    reason: "Keep attacks focused on arguments, not users.",
  },
];

// Battles are text-only roasts — links and long repeated-character runs
// are almost always spam, not content worth judging.
const SPAM_PATTERNS: RegExp[] = [/(https?:\/\/|www\.)\S+/i, /(.)\1{9,}/];

function runLocalRules(content: string, context: ModeratorContext, th: ModerationThresholds): ModerationVerdict | null {
  for (const rule of BLOCK_PATTERNS) {
    if (rule.pattern.test(content)) {
      return { action: "BLOCK", category: rule.category, reason: rule.reason, toxicity_score: 95, source: "local" };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        action: "BLOCK",
        category: "spam",
        reason: "Links and character spam aren't allowed in battle messages.",
        toxicity_score: 60,
        source: "local",
      };
    }
  }

  // Low-participation guard: a message that is almost entirely emoji or
  // symbols carries no battle content. Uses Unicode letter/number classes
  // so transliterated or native-script messages (Telugu, Hindi, Tamil...)
  // still count as real text.
  const visible = content.replace(/\s/g, "");
  if (visible.length >= th.emoji_min_length) {
    const meaningful = visible.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    if (meaningful / visible.length < th.emoji_meaningful_ratio) {
      return {
        action: "WARN",
        category: "spam",
        reason: "Emoji or symbol spam doesn't count as participating — post a real reply.",
        toxicity_score: 25,
        source: "local",
      };
    }
  }

  // Flood/duplicate detection: this user repeating (near-)identical
  // content this battle.
  if (context.recentMessages?.some((m) => normalize(m) === normalize(content))) {
    return {
      action: "WARN",
      category: "spam",
      reason: "Try to keep each round fresh instead of repeating yourself.",
      toxicity_score: 30,
      source: "local",
    };
  }

  for (const rule of WARN_PATTERNS) {
    if (rule.pattern.test(content)) {
      return { action: "WARN", category: rule.category, reason: rule.reason, toxicity_score: 45, source: "local" };
    }
  }

  return null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// =========================================================
// Secondary local heuristics — coarser checks for the ambiguous middle.
// =========================================================

const FALLBACK_INSULT_WORDS = [
  "idiot", "moron", "trash", "garbage", "pathetic", "worthless", "loser", "stupid", "dumb", "ugly",
];

function runFallbackHeuristics(content: string, th: ModerationThresholds): ModerationVerdict {
  // Local hard-BLOCK rules already ran in analyzeMessage() before we ever
  // got here, so obvious dangerous content is already handled. This coarser
  // pass errs toward WARN rather than blanket-allowing ambiguous attacks.
  const lower = content.toLowerCase();
  const letters = content.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters.length > 0 ? (content.match(/[A-Z]/g)?.length ?? 0) / letters.length : 0;
  const insultHits = FALLBACK_INSULT_WORDS.filter((w) => lower.includes(w)).length;

  if (insultHits >= th.insult_warn_count || (capsRatio > th.caps_ratio && content.length > th.caps_min_length)) {
    return {
      action: "WARN",
      category: "personal_attack",
      reason: "Flagged by secondary local moderation checks for review.",
      toxicity_score: 55,
      source: "fallback",
    };
  }

  return {
    action: "ALLOW",
    category: "safe_roast",
    reason: "No red flags from secondary local moderation checks.",
    toxicity_score: 10,
    source: "fallback",
  };
}
