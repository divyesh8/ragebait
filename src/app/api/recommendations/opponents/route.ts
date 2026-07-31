import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRecommendedOpponents } from "@/services/aiMatchmaking";

// GET /api/recommendations/opponents - intelligent opponent matching.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 8));

  try {
    const opponents = await getRecommendedOpponents(session.userId, limit);
    return NextResponse.json({ opponents });
  } catch (err) {
    console.error("Opponent recommendations error:", err);
    return NextResponse.json({ error: "Could not load opponent recommendations." }, { status: 500 });
  }
}

