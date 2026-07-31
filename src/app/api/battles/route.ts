import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { battleCreateSchema } from "@/lib/validation";
import { notifyRecommendedBattle } from "@/lib/notifications";

const BATTLE_EXPIRY_MINUTES = 10;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity

function generateBattleCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueBattleCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateBattleCode();
    const existing = await sql`SELECT 1 FROM battles WHERE battle_code = ${code} LIMIT 1`;
    if (existing.length === 0) return code;
  }
  // Astronomically unlikely to ever hit this, but fail loudly rather than silently collide.
  throw new Error("Could not generate a unique battle code.");
}

/** Flips any 'waiting' battles past their expiry into 'expired'. Cheap, indexed, runs on every read. */
async function expireStaleBattles() {
  await sql`
    UPDATE battles SET status = 'expired'
    WHERE status = 'waiting'
      AND battle_source = 'PLAYER_VS_PLAYER'
      AND expires_at < now()
  `;
}

// GET /api/battles?status=waiting|active|completed  (omit status to get everything except cancelled/expired/deleted)
// GET /api/battles?creatorId=<id>&includeDeleted=true — used by a user's own profile history,
//   so their deleted battles still show up there even though they're hidden from the public feed.
//   includeDeleted is only honored when creatorId matches the requester's own session — nobody
//   can pull another user's deleted battle list.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const includeDeletedParam = req.nextUrl.searchParams.get("includeDeleted") === "true";

  try {
    await expireStaleBattles();

    const includeDeleted = includeDeletedParam && session.userId === creatorId;

    const rows = creatorId
      ? includeDeleted
        ? await sql`
            SELECT
              b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
              b.rounds, b.winner_id, b.ai_summary, b.created_at, b.started_at, b.completed_at, b.expires_at,
              b.deleted_at, b.deleted_by,
              creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
              creator_profile.preferred_battle_style AS creator_playstyle,
              creator_profile.strengths AS creator_strengths,
              creator_profile.weaknesses AS creator_weaknesses,
              creator_profile.average_creativity AS creator_average_creativity,
              creator_profile.average_logic AS creator_average_logic,
              creator_profile.average_humor AS creator_average_humor,
              creator_profile.average_originality AS creator_average_originality,
              creator_profile.average_comeback AS creator_average_comeback,
              creator_profile.average_entertainment AS creator_average_entertainment,
              opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
            FROM battles b
            JOIN users creator ON creator.id = b.created_by
            LEFT JOIN player_ai_profiles creator_profile ON creator_profile.user_id = creator.id
            LEFT JOIN users opponent ON opponent.id = b.opponent_id
            WHERE b.created_by = ${creatorId}
              AND b.battle_source = 'PLAYER_VS_PLAYER'
              AND b.battle_visibility = 'PUBLIC'
              AND b.hidden_from_players = FALSE
              AND b.is_ai_generated = FALSE
            ORDER BY b.created_at DESC
            LIMIT 50
          `
        : await sql`
            SELECT
              b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
              b.rounds, b.winner_id, b.ai_summary, b.created_at, b.started_at, b.completed_at, b.expires_at,
              b.deleted_at, b.deleted_by,
              creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
              creator_profile.preferred_battle_style AS creator_playstyle,
              creator_profile.strengths AS creator_strengths,
              creator_profile.weaknesses AS creator_weaknesses,
              creator_profile.average_creativity AS creator_average_creativity,
              creator_profile.average_logic AS creator_average_logic,
              creator_profile.average_humor AS creator_average_humor,
              creator_profile.average_originality AS creator_average_originality,
              creator_profile.average_comeback AS creator_average_comeback,
              creator_profile.average_entertainment AS creator_average_entertainment,
              opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
            FROM battles b
            JOIN users creator ON creator.id = b.created_by
            LEFT JOIN player_ai_profiles creator_profile ON creator_profile.user_id = creator.id
            LEFT JOIN users opponent ON opponent.id = b.opponent_id
            WHERE b.created_by = ${creatorId}
              AND b.status != 'deleted'
              AND b.battle_source = 'PLAYER_VS_PLAYER'
              AND b.battle_visibility = 'PUBLIC'
              AND b.hidden_from_players = FALSE
              AND b.is_ai_generated = FALSE
            ORDER BY b.created_at DESC
            LIMIT 50
          `
      : status
      ? await sql`
          SELECT
            b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
            b.rounds, b.winner_id, b.ai_summary, b.created_at, b.started_at, b.completed_at, b.expires_at,
            creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
            creator_profile.preferred_battle_style AS creator_playstyle,
            creator_profile.strengths AS creator_strengths,
            creator_profile.weaknesses AS creator_weaknesses,
            creator_profile.average_creativity AS creator_average_creativity,
            creator_profile.average_logic AS creator_average_logic,
            creator_profile.average_humor AS creator_average_humor,
            creator_profile.average_originality AS creator_average_originality,
            creator_profile.average_comeback AS creator_average_comeback,
            creator_profile.average_entertainment AS creator_average_entertainment,
            opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
          FROM battles b
          JOIN users creator ON creator.id = b.created_by
          LEFT JOIN player_ai_profiles creator_profile ON creator_profile.user_id = creator.id
          LEFT JOIN users opponent ON opponent.id = b.opponent_id
          WHERE b.status = ${status}
            AND b.battle_source = 'PLAYER_VS_PLAYER'
            AND b.battle_visibility = 'PUBLIC'
            AND b.hidden_from_players = FALSE
            AND b.is_ai_generated = FALSE
          ORDER BY b.created_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT
            b.id, b.battle_code, b.title, b.topic, b.battle_type, b.mode, b.status,
            b.rounds, b.winner_id, b.ai_summary, b.created_at, b.started_at, b.completed_at, b.expires_at,
            creator.id AS creator_id, creator.user_id::text AS creator_user_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
            creator_profile.preferred_battle_style AS creator_playstyle,
            creator_profile.strengths AS creator_strengths,
            creator_profile.weaknesses AS creator_weaknesses,
            creator_profile.average_creativity AS creator_average_creativity,
            creator_profile.average_logic AS creator_average_logic,
            creator_profile.average_humor AS creator_average_humor,
            creator_profile.average_originality AS creator_average_originality,
            creator_profile.average_comeback AS creator_average_comeback,
            creator_profile.average_entertainment AS creator_average_entertainment,
            opponent.id AS opponent_id, opponent.user_id::text AS opponent_user_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
          FROM battles b
          JOIN users creator ON creator.id = b.created_by
          LEFT JOIN player_ai_profiles creator_profile ON creator_profile.user_id = creator.id
          LEFT JOIN users opponent ON opponent.id = b.opponent_id
          WHERE b.status NOT IN ('cancelled', 'expired', 'deleted')
            AND b.battle_source = 'PLAYER_VS_PLAYER'
            AND b.battle_visibility = 'PUBLIC'
            AND b.hidden_from_players = FALSE
            AND b.is_ai_generated = FALSE
          ORDER BY b.created_at DESC
          LIMIT 50
        `;

    return NextResponse.json({ battles: rows });
  } catch (err) {
    console.error("List battles error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST /api/battles — create a new battle, status 'waiting', auto-expires in 10 minutes if nobody joins
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = battleCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { title, topic, battleType, mode, rounds } = parsed.data;

  try {
    const battleCode = await generateUniqueBattleCode();
    const expiresAt = new Date(Date.now() + BATTLE_EXPIRY_MINUTES * 60 * 1000);

    const rows = await sql`
      INSERT INTO battles (title, topic, battle_type, mode, status, created_by, rounds, battle_code, expires_at)
      VALUES (${title}, ${topic}, ${battleType}, ${mode}, 'waiting', ${session.userId}, ${rounds}, ${battleCode}, ${expiresAt.toISOString()})
      RETURNING id, battle_code, title, topic, battle_type, mode, status, rounds, created_at, expires_at
    `;

    await notifyRecommendedBattle({
      battleId: rows[0].id,
      battleTitle: rows[0].title,
      topic: rows[0].topic,
      creatorId: session.userId,
      creatorUsername: session.username,
    });

    return NextResponse.json({ battle: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Create battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
