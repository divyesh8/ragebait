import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getGlobalFallbackFeed, getPersonalizedFeed } from "@/services/recommendationEngine";

// GET /api/recommendations/feed - personalized Phase 4 home feed.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

  try {
    const feed = session
      ? await getPersonalizedFeed(session.userId, forceRefresh)
      : await getGlobalFallbackFeed();
    return NextResponse.json({ feed });
  } catch (err) {
    console.error("Recommendation feed error:", err);
    return NextResponse.json({ error: "Could not load recommendations." }, { status: 500 });
  }
}

