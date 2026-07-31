import { NextResponse } from "next/server";
import { analyzeTrends, saveTrendSnapshot } from "@/services/trendAnalyzer";

export const dynamic = "force-dynamic";

// GET /api/recommendations/trends - global topic/style trend analysis.
export async function GET() {
  try {
    const trends = await analyzeTrends();
    await saveTrendSnapshot(trends);
    return NextResponse.json({ trends });
  } catch (err) {
    console.error("Trend analysis error:", err);
    return NextResponse.json({ error: "Could not load trends." }, { status: 500 });
  }
}
