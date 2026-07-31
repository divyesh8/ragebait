import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// GET /api/creator/reports — pending reports, newest first
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const rows = await sql`
    SELECT r.id, r.target_type, r.target_id, r.reason, r.description, r.status, r.created_at,
           reporter.username AS reporter_username,
           target_user.username AS target_username,
           target_user.id AS target_user_id
    FROM reports r
    JOIN users reporter ON reporter.id = r.reporter_id
    LEFT JOIN users target_user
      ON r.target_type = 'user' AND target_user.id::text = r.target_id::text
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
    LIMIT 50
  `;
  return NextResponse.json({ reports: rows });
}

const actionSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["dismiss", "warn", "mute", "ban_temporary"]),
  reason: z.string().min(3, "A reason is required for every creator action."),
  /** Hours — used for mute (chat cooldown) and ban_temporary. */
  durationHours: z.number().int().positive().max(24 * 365).optional(),
});

// POST /api/creator/reports — resolve a report with an enforcement action
export async function POST(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { reportId, action, reason, durationHours } = parsed.data;

  const reports = await sql`
    SELECT id, target_type, target_id, status FROM reports WHERE id = ${reportId} LIMIT 1
  `;
  if (reports.length === 0) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const report = reports[0];
  if (report.status !== "pending") {
    return NextResponse.json({ error: "This report was already resolved." }, { status: 409 });
  }

  // Enforcement against the reported user (only meaningful for user targets).
  const targetUserId = report.target_type === "user" ? String(report.target_id) : null;
  const hours = durationHours ?? 24;

  if (action !== "dismiss" && !targetUserId) {
    return NextResponse.json({ error: "Enforcement actions need a user target report." }, { status: 400 });
  }

  if (action === "warn" && targetUserId) {
    await sql`
      INSERT INTO moderation_logs (user_id, battle_id, message_id, action, category, reason, toxicity_score, source)
      VALUES (${targetUserId}, NULL, NULL, 'WARN', 'harassment', ${`Creator report review: ${reason}`}, 50, 'local')
    `;
  } else if (action === "mute" && targetUserId) {
    const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    await sql`
      INSERT INTO user_moderation_penalties (user_id, penalty_type, level, reason, trigger_count, expires_at)
      VALUES (${targetUserId}, 'chat_cooldown', 1, ${`Creator report review: ${reason}`}, 1, ${expiresAt})
    `;
  } else if (action === "ban_temporary" && targetUserId) {
    const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    await sql`
      UPDATE users SET account_status = 'banned', status_reason = ${reason}, status_expires_at = ${expiresAt}
      WHERE id = ${targetUserId}
    `;
  }

  const resolved = action === "dismiss" ? "dismissed" : "actioned";
  await sql`
    UPDATE reports SET status = ${resolved}, reviewed_by = ${creator.userId}, reviewed_at = now()
    WHERE id = ${reportId}
  `;

  await recordCreatorAction({
    creatorUserId: creator.userId,
    targetUserId,
    action: `report.${action}`,
    previousValue: { reportId, status: "pending" },
    newValue: { reportId, status: resolved, durationHours: action === "dismiss" ? undefined : hours },
    reason,
    req,
  });

  return NextResponse.json({ success: true, status: resolved });
}
