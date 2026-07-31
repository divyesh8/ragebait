/**
 * Moderation enforcement — Phase 2 audit upgrade.
 *
 * This is the DB-backed layer that sits between the pure `aiModerator`
 * service (src/services/aiModerator.ts, no DB access) and the API routes.
 * It owns:
 *   - writing every moderation verdict to `moderation_logs`
 *   - cumulative per-user violation counts + escalating penalties
 *   - rate limiting / anti-spam checks
 *   - analytics aggregation for a future admin dashboard
 *
 * Kept deliberately separate from the AI Judge (Phase 1) and from
 * aiModerator.ts itself — this file is the only place that touches
 * moderation-related tables.
 */

import { sql } from "@/lib/db";
import type { ModerationAction, ModerationCategory, ModerationSource } from "@/services/aiModerator";

// =========================================================
// Escalation schedule
// =========================================================

/** Every Nth cumulative WARN triggers a new (longer) chat cooldown. */
const WARN_ESCALATION_THRESHOLD = 3;
/** Every Nth cumulative BLOCK triggers a new (longer) battle suspension. */
const BLOCK_ESCALATION_THRESHOLD = 5;

/** Cooldown length in minutes, indexed by escalation level (1st hit, 2nd hit, ...). Last value repeats for further levels. */
const COOLDOWN_SCHEDULE_MINUTES = [10, 30, 60, 240, 1440]; // 10m, 30m, 1h, 4h, 24h
/** Suspension length in hours, indexed by escalation level. Last value repeats for further levels. */
const SUSPENSION_SCHEDULE_HOURS = [1, 6, 24, 72, 168]; // 1h, 6h, 1d, 3d, 7d

export type PenaltyType = "chat_cooldown" | "battle_suspension";

export interface EscalationEvent {
  penaltyType: PenaltyType;
  level: number;
  expiresAt: string;
  reason: string;
}

export interface ActivePenalty {
  penaltyType: PenaltyType;
  reason: string;
  expiresAt: string;
}

function scheduleValue(schedule: number[], level: number): number {
  return schedule[Math.min(level - 1, schedule.length - 1)];
}

// =========================================================
// Logging + escalation
// =========================================================

export interface ModerationLogEntry {
  userId: string;
  battleId: string | null;
  messageId: string | null;
  action: ModerationAction;
  category: ModerationCategory;
  reason: string;
  toxicityScore: number;
  source: ModerationSource;
}

/**
 * Writes a moderation verdict to the audit log, then checks whether this
 * user just crossed a new escalation threshold. Returns the newly-triggered
 * penalty (if any) so the caller can surface it immediately — otherwise
 * a user wouldn't find out about a cooldown until their *next* message.
 */
export async function recordModerationEvent(entry: ModerationLogEntry): Promise<EscalationEvent | null> {
  await sql`
    INSERT INTO moderation_logs (user_id, battle_id, message_id, action, category, reason, toxicity_score, source)
    VALUES (${entry.userId}, ${entry.battleId}, ${entry.messageId}, ${entry.action}, ${entry.category}, ${entry.reason}, ${entry.toxicityScore}, ${entry.source})
  `;

  if (entry.action === "WARN") return checkWarnEscalation(entry.userId);
  if (entry.action === "BLOCK") return checkBlockEscalation(entry.userId);
  return null;
}

async function checkWarnEscalation(userId: string): Promise<EscalationEvent | null> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM moderation_logs WHERE user_id = ${userId} AND action = 'WARN'
  `;
  const count = rows[0]?.count ?? 0;
  if (count === 0 || count % WARN_ESCALATION_THRESHOLD !== 0) return null;

  const level = count / WARN_ESCALATION_THRESHOLD;
  const minutes = scheduleValue(COOLDOWN_SCHEDULE_MINUTES, level);
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  const reason = `${count} warnings reached — chat cooldown (level ${level}, ${minutes}m).`;

  await sql`
    INSERT INTO user_moderation_penalties (user_id, penalty_type, level, reason, trigger_count, expires_at)
    VALUES (${userId}, 'chat_cooldown', ${level}, ${reason}, ${count}, ${expiresAt.toISOString()})
  `;

  return { penaltyType: "chat_cooldown", level, expiresAt: expiresAt.toISOString(), reason };
}

async function checkBlockEscalation(userId: string): Promise<EscalationEvent | null> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM moderation_logs WHERE user_id = ${userId} AND action = 'BLOCK'
  `;
  const count = rows[0]?.count ?? 0;
  if (count === 0 || count % BLOCK_ESCALATION_THRESHOLD !== 0) return null;

  const level = count / BLOCK_ESCALATION_THRESHOLD;
  const hours = scheduleValue(SUSPENSION_SCHEDULE_HOURS, level);
  const expiresAt = new Date(Date.now() + hours * 3_600_000);
  const reason = `${count} blocked messages reached — battle suspension (level ${level}, ${hours}h).`;

  await sql`
    INSERT INTO user_moderation_penalties (user_id, penalty_type, level, reason, trigger_count, expires_at)
    VALUES (${userId}, 'battle_suspension', ${level}, ${reason}, ${count}, ${expiresAt.toISOString()})
  `;

  return { penaltyType: "battle_suspension", level, expiresAt: expiresAt.toISOString(), reason };
}

/** Returns the currently-active penalty of a given type for a user, or null. */
export async function getActivePenalty(userId: string, type: PenaltyType): Promise<ActivePenalty | null> {
  const rows = await sql`
    SELECT reason, expires_at FROM user_moderation_penalties
    WHERE user_id = ${userId} AND penalty_type = ${type} AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  return { penaltyType: type, reason: rows[0].reason as string, expiresAt: rows[0].expires_at as string };
}

/** Cumulative violation summary for a user — used by both enforcement and analytics. */
export interface UserViolationSummary {
  allowCount: number;
  warnCount: number;
  blockCount: number;
  activeCooldown: ActivePenalty | null;
  activeSuspension: ActivePenalty | null;
}

export async function getUserViolationSummary(userId: string): Promise<UserViolationSummary> {
  const [counts, cooldown, suspension] = await Promise.all([
    sql`SELECT action, COUNT(*)::int AS count FROM moderation_logs WHERE user_id = ${userId} GROUP BY action`,
    getActivePenalty(userId, "chat_cooldown"),
    getActivePenalty(userId, "battle_suspension"),
  ]);

  const find = (action: string) => (counts as any[]).find((r) => r.action === action)?.count ?? 0;

  return {
    allowCount: find("ALLOW"),
    warnCount: find("WARN"),
    blockCount: find("BLOCK"),
    activeCooldown: cooldown,
    activeSuspension: suspension,
  };
}

// =========================================================
// Rate limiting / anti-spam
// =========================================================

/** Minimum gap required between two messages from the same user, in seconds. */
const RATE_LIMIT_COOLDOWN_SECONDS = 2;
/** Max messages a single user can have moderated in a rolling 60s window. */
const RATE_LIMIT_MAX_PER_MINUTE = 12;

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Checked before the AI moderator is ever invoked, so flooding never
 * translates into flooding the AI endpoint. Backed by `moderation_logs`
 * timestamps rather than in-memory state, since serverless functions
 * don't share memory across invocations/instances.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const rows = await sql`
    SELECT created_at FROM moderation_logs
    WHERE user_id = ${userId} AND created_at > now() - interval '60 seconds'
    ORDER BY created_at DESC
  `;

  if (rows.length > 0) {
    const lastAt = new Date(rows[0].created_at as string).getTime();
    const gapSeconds = (Date.now() - lastAt) / 1000;
    if (gapSeconds < RATE_LIMIT_COOLDOWN_SECONDS) {
      return {
        allowed: false,
        reason: "You're posting too fast — slow down a little.",
        retryAfterSeconds: Math.ceil(RATE_LIMIT_COOLDOWN_SECONDS - gapSeconds),
      };
    }
  }

  if (rows.length >= RATE_LIMIT_MAX_PER_MINUTE) {
    return {
      allowed: false,
      reason: "You've hit the message limit for this minute — take a breather.",
      retryAfterSeconds: 60,
    };
  }

  return { allowed: true };
}

// =========================================================
// Analytics (prep for a future admin dashboard)
// =========================================================

export interface ModerationAnalytics {
  totalMessages: number;
  allowCount: number;
  warnCount: number;
  blockCount: number;
  categoryBreakdown: { category: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  /** % of AI-eligible verdicts (source in ai|fallback) that had to fall back to local heuristics. */
  fallbackRatePercent: number;
  topOffenders: { userId: string; username: string; warnCount: number; blockCount: number }[];
  generatedAt: string;
}

/**
 * No admin-role concept exists in this codebase yet (no `is_admin` column,
 * no admin routes) — deliberately not wiring this up to an HTTP endpoint
 * to avoid exposing other users' violation history to any logged-in user.
 * This function is ready to be called from an admin-gated route once that
 * exists.
 */
export async function getModerationAnalytics(): Promise<ModerationAnalytics> {
  const [actionRows, categoryRows, sourceRows, offenderRows] = await Promise.all([
    sql`SELECT action, COUNT(*)::int AS count FROM moderation_logs GROUP BY action`,
    sql`SELECT category, COUNT(*)::int AS count FROM moderation_logs GROUP BY category ORDER BY count DESC`,
    sql`SELECT source, COUNT(*)::int AS count FROM moderation_logs GROUP BY source`,
    sql`
      SELECT ml.user_id, u.username,
        COUNT(*) FILTER (WHERE ml.action = 'WARN')::int AS warn_count,
        COUNT(*) FILTER (WHERE ml.action = 'BLOCK')::int AS block_count
      FROM moderation_logs ml
      JOIN users u ON u.id = ml.user_id
      GROUP BY ml.user_id, u.username
      HAVING COUNT(*) FILTER (WHERE ml.action IN ('WARN', 'BLOCK')) > 0
      ORDER BY block_count DESC, warn_count DESC
      LIMIT 20
    `,
  ]);

  const find = (rows: any[], key: string, value: string) => rows.find((r) => r[key] === value)?.count ?? 0;

  const allowCount = find(actionRows as any[], "action", "ALLOW");
  const warnCount = find(actionRows as any[], "action", "WARN");
  const blockCount = find(actionRows as any[], "action", "BLOCK");
  const aiCount = find(sourceRows as any[], "source", "ai");
  const fallbackCount = find(sourceRows as any[], "source", "fallback");
  const aiEligible = aiCount + fallbackCount;

  return {
    totalMessages: allowCount + warnCount + blockCount,
    allowCount,
    warnCount,
    blockCount,
    categoryBreakdown: (categoryRows as any[]).map((r) => ({ category: r.category, count: r.count })),
    sourceBreakdown: (sourceRows as any[]).map((r) => ({ source: r.source, count: r.count })),
    fallbackRatePercent: aiEligible > 0 ? Math.round((fallbackCount / aiEligible) * 100) : 0,
    topOffenders: (offenderRows as any[]).map((r) => ({
      userId: r.user_id,
      username: r.username,
      warnCount: r.warn_count,
      blockCount: r.block_count,
    })),
    generatedAt: new Date().toISOString(),
  };
}
