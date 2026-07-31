import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import { genderSchema } from "@/lib/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";

// All creator endpoints return 404 (not 403) for non-founders so the
// panel's existence can't be confirmed by URL guessing.
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// GET /api/creator/users/:id — full detail for the profile drawer
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const [users, auraTx, penalties, moderation] = await Promise.all([
    sql`
      SELECT id, user_id::text AS public_id, username, email, email_verified, aura, level, xp,
             wins, losses, current_streak, best_streak, bio, avatar_url, gender,
             show_gender_on_public_profile,
             account_status, status_reason, status_expires_at, created_at
      FROM users WHERE id = ${params.id} LIMIT 1
    `,
    sql`
      SELECT amount, reason, battle_id, created_at FROM aura_transactions
      WHERE user_id = ${params.id} ORDER BY created_at DESC LIMIT 25
    `,
    sql`
      SELECT penalty_type, level, reason, expires_at, created_at FROM user_moderation_penalties
      WHERE user_id = ${params.id} ORDER BY created_at DESC LIMIT 10
    `,
    sql`
      SELECT action, COUNT(*)::int AS count FROM moderation_logs
      WHERE user_id = ${params.id} GROUP BY action
    `,
  ]);

  if (users.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: users[0], auraTransactions: auraTx, penalties, moderation });
}

// PATCH /api/creator/users/:id — profile edits (username, bio, avatar, email verification)
const patchSchema = z.object({
  reason: z.string().min(3, "A reason is required for every creator action."),
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().max(1000).optional(),
  gender: genderSchema.optional(),
  showGenderOnPublicProfile: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { reason, username, bio, avatarUrl, gender, showGenderOnPublicProfile, emailVerified } = parsed.data;

  const before = await sql`
    SELECT username, bio, avatar_url, gender, show_gender_on_public_profile, email_verified
    FROM users WHERE id = ${params.id} LIMIT 1
  `;
  if (before.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await sql`
    UPDATE users SET
      username = COALESCE(${username ?? null}, username),
      bio = COALESCE(${bio ?? null}, bio),
      avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
      gender = COALESCE(${gender ?? null}, gender),
      show_gender_on_public_profile = COALESCE(${showGenderOnPublicProfile ?? null}, show_gender_on_public_profile),
      email_verified = COALESCE(${emailVerified ?? null}, email_verified)
    WHERE id = ${params.id}
    RETURNING username, bio, avatar_url, gender, show_gender_on_public_profile, email_verified
  `;

  await recordCreatorAction({
    creatorUserId: creator.userId,
    targetUserId: params.id,
    action: "user.profile_edit",
    previousValue: before[0],
    newValue: updated[0],
    reason,
    req,
  });

  return NextResponse.json({ success: true, user: updated[0] });
}

// POST /api/creator/users/:id — economy + status actions
const actionSchema = z.object({
  reason: z.string().min(3, "A reason is required for every creator action."),
  action: z.enum([
    "aura_set", "aura_adjust", "aura_reset",
    "xp_set", "xp_adjust", "xp_reset",
    "freeze", "unfreeze",
    "ban_temporary", "ban_permanent", "unban",
    "delete_account",
  ]),
  amount: z.number().int().optional(),
  /** Hours, for ban_temporary. */
  durationHours: z.number().int().positive().max(24 * 365).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { action, reason, amount, durationHours } = parsed.data;

  // The founder account itself can't be frozen, banned, or zeroed out —
  // there is exactly one Creator and nothing may lock them out.
  if (params.id === creator.userId && !action.startsWith("aura") && !action.startsWith("xp")) {
    return NextResponse.json({ error: "The founder account cannot be frozen or banned." }, { status: 400 });
  }

  const before = await sql`
    SELECT aura, xp, account_status, status_reason, status_expires_at
    FROM users WHERE id = ${params.id} LIMIT 1
  `;
  if (before.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const prev = before[0];

  let newValue: unknown = null;

  if (action === "aura_set" || action === "aura_adjust" || action === "aura_reset") {
    if ((action === "aura_set" || action === "aura_adjust") && typeof amount !== "number") {
      return NextResponse.json({ error: "amount is required for this action." }, { status: 400 });
    }
    const target =
      action === "aura_reset" ? 0 :
      action === "aura_set" ? Math.max(0, amount!) :
      Math.max(0, Number(prev.aura) + amount!);
    const delta = target - Number(prev.aura);

    await sql`UPDATE users SET aura = ${target} WHERE id = ${params.id}`;
    // Keep the same permanent trail battle Aura uses, so the user's Aura
    // history stays complete and consistent.
    await sql`
      INSERT INTO aura_transactions (user_id, amount, reason, battle_id)
      VALUES (${params.id}, ${delta}, ${`Creator: ${reason}`}, ${null})
    `;
    newValue = { aura: target };
  } else if (action === "xp_set" || action === "xp_adjust" || action === "xp_reset") {
    if ((action === "xp_set" || action === "xp_adjust") && typeof amount !== "number") {
      return NextResponse.json({ error: "amount is required for this action." }, { status: 400 });
    }
    const target =
      action === "xp_reset" ? 0 :
      action === "xp_set" ? Math.max(0, amount!) :
      Math.max(0, Number(prev.xp) + amount!);
    await sql`UPDATE users SET xp = ${target} WHERE id = ${params.id}`;
    newValue = { xp: target };
  } else if (action === "freeze") {
    await sql`
      UPDATE users SET account_status = 'frozen', status_reason = ${reason}, status_expires_at = NULL
      WHERE id = ${params.id}
    `;
    newValue = { account_status: "frozen" };
  } else if (action === "unfreeze" || action === "unban") {
    await sql`
      UPDATE users SET account_status = 'active', status_reason = NULL, status_expires_at = NULL
      WHERE id = ${params.id}
    `;
    newValue = { account_status: "active" };
  } else if (action === "delete_account") {
    // Hard delete; battles, messages, and penalties cascade via FKs. The
    // audit row below is what preserves the record of who was removed & why.
    const identity = await sql`SELECT username, email FROM users WHERE id = ${params.id} LIMIT 1`;
    await sql`DELETE FROM users WHERE id = ${params.id}`;
    newValue = { deleted: true, username: identity[0]?.username, email: identity[0]?.email };
  } else if (action === "ban_temporary" || action === "ban_permanent") {
    const expiresAt =
      action === "ban_temporary"
        ? new Date(Date.now() + (durationHours ?? 24) * 3_600_000).toISOString()
        : null;
    await sql`
      UPDATE users SET account_status = 'banned', status_reason = ${reason}, status_expires_at = ${expiresAt}
      WHERE id = ${params.id}
    `;
    newValue = { account_status: "banned", status_expires_at: expiresAt };
  }

  await recordCreatorAction({
    creatorUserId: creator.userId,
    // A deleted user id would violate the audit FK — identity lives in new_value.
    targetUserId: action === "delete_account" ? null : params.id,
    action: `user.${action}`,
    previousValue: { aura: prev.aura, xp: prev.xp, account_status: prev.account_status },
    newValue,
    reason,
    req,
  });

  return NextResponse.json({ success: true, result: newValue });
}
