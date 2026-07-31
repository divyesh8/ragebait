import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ensurePlayerSearchIndex, searchPlayers } from "@/services/socialGraph";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [] });

  try {
    ensurePlayerSearchIndex().catch(() => undefined);
    const players = await searchPlayers(q, session.userId, 12);
    return NextResponse.json({ players });
  } catch (err) {
    console.error("Player search error:", err);
    return NextResponse.json({ error: "Unable to search players." }, { status: 500 });
  }
}
