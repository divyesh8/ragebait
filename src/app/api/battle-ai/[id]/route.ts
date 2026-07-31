import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getBattleAi } from "@/services/battleAiSystem";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const battle = await getBattleAi(params.id, session.userId);
    if (!battle) return NextResponse.json({ error: "Battle AI match not found." }, { status: 404 });
    return NextResponse.json({ battle });
  } catch (err) {
    console.error("Get Battle AI error:", err);
    return NextResponse.json({ error: "Unable to load Battle AI match." }, { status: 500 });
  }
}
