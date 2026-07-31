import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { listPlayerAiBattles, startBattleAi } from "@/services/battleAiSystem";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  opponentSlug: z.string().min(1).max(80),
  difficulty: z.enum(["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend", "Mythic"]),
  languageMode: z.enum(["Auto", "English", "Hindi", "Hinglish", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Punjabi", "Urdu"]).default("Auto"),
  topic: z.string().trim().min(2).max(80),
  rounds: z.number().int().min(1).max(5).default(3),
});

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    return NextResponse.json({ battles: await listPlayerAiBattles(session.userId) });
  } catch (err) {
    console.error("List Battle AI error:", err);
    return NextResponse.json({ error: "Unable to load Battle AI history." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Battle AI setup." }, { status: 400 });
  }

  try {
    const battle = await startBattleAi({
      userId: session.userId,
      opponentSlug: parsed.data.opponentSlug,
      difficulty: parsed.data.difficulty,
      languageMode: parsed.data.languageMode,
      topic: parsed.data.topic,
      rounds: parsed.data.rounds,
    });
    return NextResponse.json({ battle }, { status: 201 });
  } catch (err) {
    console.error("Start Battle AI error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to start Battle AI." }, { status: 500 });
  }
}
