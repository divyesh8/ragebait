import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/leaderboard — top users ranked by Aura
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT user_id::text AS "userId", username, avatar_url, aura, wins, losses
      FROM users
      ORDER BY aura DESC, wins DESC
      LIMIT 50
    `;

    const leaderboard = rows.map((row, index) => {
      const total = row.wins + row.losses;
      const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;
      return {
        rank: index + 1,
        userId: row.userId,
        username: row.username,
        avatarUrl: row.avatar_url,
        aura: row.aura,
        wins: row.wins,
        winRate,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
