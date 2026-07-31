import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { searchPlayers } from "@/services/socialGraph";

export const dynamic = "force-dynamic";

type UnifiedResult = {
  id: string;
  type: "battle" | "player" | "topic";
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string | null;
  score: number;
};

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ results: [] });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;

  try {
    const [players, battleCodeRows, battleRows, topicRows] = await Promise.all([
      searchPlayers(q, session.userId, 5),
      sql`
        SELECT id, battle_code, title, topic, status
        FROM battles
        WHERE UPPER(battle_code) = UPPER(${q})
          AND battle_source = 'PLAYER_VS_PLAYER'
          AND battle_visibility = 'PUBLIC'
          AND hidden_from_players = FALSE
          AND is_ai_generated = FALSE
        LIMIT 3
      `,
      sql`
        SELECT id, battle_code, title, topic, status
        FROM battles
        WHERE (title ILIKE ${like}
           OR topic ILIKE ${like}
           OR id::text = ${q})
          AND battle_source = 'PLAYER_VS_PLAYER'
          AND battle_visibility = 'PUBLIC'
          AND hidden_from_players = FALSE
          AND is_ai_generated = FALSE
        ORDER BY created_at DESC
        LIMIT 6
      `,
      sql`
        SELECT topic, COUNT(*)::int AS count, MAX(created_at) AS latest
        FROM battles
        WHERE topic ILIKE ${like}
          AND battle_source = 'PLAYER_VS_PLAYER'
          AND battle_visibility = 'PUBLIC'
          AND hidden_from_players = FALSE
          AND is_ai_generated = FALSE
        GROUP BY topic
        ORDER BY count DESC, latest DESC
        LIMIT 5
      `,
    ]);

    const results: UnifiedResult[] = [];

    for (const battle of battleCodeRows) {
      results.push({
        id: String(battle.id),
        type: "battle",
        title: String(battle.title),
        subtitle: `Battle #${battle.battle_code} / ${battle.status}`,
        href: `/battles/${battle.id}`,
        score: 100,
      });
    }

    for (const player of players) {
      results.push({
        id: player.id,
        type: "player",
        title: player.username,
        subtitle: `Player ID ${player.userId} / ${player.rank} / ${player.aura} Aura`,
        href: `/profile/${player.userId}`,
        avatarUrl: player.avatarUrl,
        score: player.userId === q || player.username.toLowerCase() === q.toLowerCase() ? 95 : 75,
      });
    }

    for (const battle of battleRows) {
      if (results.some((result) => result.id === String(battle.id) && result.type === "battle")) continue;
      results.push({
        id: String(battle.id),
        type: "battle",
        title: String(battle.title),
        subtitle: `${battle.topic} / #${battle.battle_code} / ${battle.status}`,
        href: `/battles/${battle.id}`,
        score: 65,
      });
    }

    for (const topic of topicRows) {
      results.push({
        id: String(topic.topic),
        type: "topic",
        title: String(topic.topic),
        subtitle: `${topic.count} battles using this topic`,
        href: `/battles?topic=${encodeURIComponent(String(topic.topic))}`,
        score: 55,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (err) {
    console.error("Unified search error:", err);
    return NextResponse.json({ error: "Unable to search." }, { status: 500 });
  }
}
