import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const actionSchema = z.object({
  reason: z.string().min(3, "A reason is required for every creator action."),
  action: z.enum(["force_end", "override_winner", "declare_draw", "delete_battle"]),
  /** users.id of the new winner, for override_winner. */
  winnerId: z.string().uuid().optional(),
});

// POST /api/creator/battles/:id — live battle control
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { action, reason, winnerId } = parsed.data;

  const rows = await sql`
    SELECT id, title, status, winner_id, created_by, opponent_id FROM battles
    WHERE id = ${params.id} LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  const battle = rows[0];

  let newValue: unknown = null;

  if (action === "force_end") {
    await sql`UPDATE battles SET status = 'cancelled', completed_at = now() WHERE id = ${params.id}`;
    newValue = { status: "cancelled" };
  } else if (action === "override_winner") {
    if (!winnerId || (winnerId !== battle.created_by && winnerId !== battle.opponent_id)) {
      return NextResponse.json({ error: "winnerId must be one of the battle's participants." }, { status: 400 });
    }
    await sql`UPDATE battles SET winner_id = ${winnerId}, status = 'completed' WHERE id = ${params.id}`;
    newValue = { winner_id: winnerId, status: "completed" };
  } else if (action === "declare_draw") {
    await sql`UPDATE battles SET winner_id = NULL, status = 'completed', completed_at = now() WHERE id = ${params.id}`;
    newValue = { winner_id: null, status: "completed" };
  } else if (action === "delete_battle") {
    // battle_messages cascade via FK; the audit row keeps the record of what was removed.
    await sql`DELETE FROM battles WHERE id = ${params.id}`;
    newValue = { deleted: true };
  }

  // Learning engine: founder overrides are training signals — the local AI
  // judged this battle one way and the founder corrected it.
  if (action === "override_winner" || action === "declare_draw") {
    await sql`
      INSERT INTO ai_feedback (battle_id, kind, payload)
      VALUES (${params.id}, 'founder_override', ${JSON.stringify({
        action,
        previousWinnerId: battle.winner_id,
        newWinnerId: action === "override_winner" ? winnerId : null,
        reason,
      })})
    `;
  }

  await recordCreatorAction({
    creatorUserId: creator.userId,
    targetUserId: null,
    action: `battle.${action}`,
    previousValue: { battleId: battle.id, title: battle.title, status: battle.status, winner_id: battle.winner_id },
    newValue,
    reason,
    req,
  });

  return NextResponse.json({ success: true, result: newValue });
}
