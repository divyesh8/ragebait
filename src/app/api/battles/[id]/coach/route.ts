import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { runAiCoach } from "@/services/aiCoach";

// POST /api/battles/:id/coach — generate (or fetch, if already generated)
// this user's personal AI coaching report for a completed battle.
//
// Idempotent: safe to call every time a participant views the battle
// result page. Only ever does real work once per (user, battle) — see
// runAiCoach() for the idempotency + race-safety details. Requires the
// battle to already be judged; never runs during a live battle.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const result = await runAiCoach(params.id, session.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AI Coach route error:", err);
    // The battle result itself is already saved by the AI Judge regardless
    // of how this call goes — coaching failures never affect that.
    const message: string = err?.message ?? "Coaching is temporarily unavailable. You can try again shortly.";
    const status = message.includes("not been judged")
      ? 409
      : message.includes("not found")
      ? 404
      : message.includes("participant")
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
