import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { analyzeMessage } from "@/services/aiModerator";
import {
  getActivePenalty,
  checkRateLimit,
  recordModerationEvent,
} from "@/lib/moderationEnforcement";
import { z } from "zod";
import {
  nextTurn,
  resolveStrike,
  resolveTimeout,
  type BattleSideKey,
  type StrikeImpact,
} from "@/services/battleEngine";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
});

// POST /api/battles/:id/messages — post a roast in a live battle
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = params;

  try {
    // Enforcement checks first — these are pure lookups against
    // moderation_logs / user_moderation_penalties, no message content
    // needed yet, so they run before we even parse the request body.
    const [suspension, cooldown] = await Promise.all([
      getActivePenalty(session.userId, "battle_suspension"),
      getActivePenalty(session.userId, "chat_cooldown"),
    ]);

    if (suspension) {
      return NextResponse.json(
        {
          error: `You're temporarily suspended from battle participation until ${new Date(suspension.expiresAt).toLocaleString()} due to repeated blocked messages.`,
          penalty: suspension,
        },
        { status: 403 }
      );
    }

    if (cooldown) {
      return NextResponse.json(
        {
          error: `You're in a chat cooldown until ${new Date(cooldown.expiresAt).toLocaleString()} due to repeated warnings.`,
          penalty: cooldown,
        },
        { status: 403 }
      );
    }

    const rateLimit = await checkRateLimit(session.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason, retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
    }

    const battleRows = await sql`
      SELECT b.id, b.created_by, b.opponent_id, b.status, b.rounds, b.topic, b.title, b.battle_type, b.mode,
             b.current_turn, b.turn_deadline, b.turn_seconds, b.engine_version, b.control_current,
             creator.username AS creator_username,
             opponent.username AS opponent_username
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
      WHERE b.id = ${id}
        AND b.battle_source = 'PLAYER_VS_PLAYER'
        AND b.battle_visibility = 'PUBLIC'
        AND b.hidden_from_players = FALSE
        AND b.is_ai_generated = FALSE
      LIMIT 1
    `;

    if (battleRows.length === 0) {
      return NextResponse.json({ error: "Battle not found." }, { status: 404 });
    }

    const battle = battleRows[0];

    if (battle.status !== "active") {
      return NextResponse.json({ error: "This battle is not currently live." }, { status: 409 });
    }

    if (battle.created_by !== session.userId && battle.opponent_id !== session.userId) {
      return NextResponse.json({ error: "You are not a participant in this battle." }, { status: 403 });
    }

    // ── Arena engine: timed exchanges + turn ownership ──
    // Legacy battles (engine_version IS NULL) skip this entirely.
    const senderSide: BattleSideKey = battle.created_by === session.userId ? "creator" : "opponent";
    if (battle.engine_version) {
      // Lazy timeout resolution: if the current turn's clock has expired,
      // apply the referee ruling (small initiative drift, turn passes) before
      // evaluating this request under the NEW turn.
      if (
        battle.current_turn &&
        battle.turn_deadline &&
        new Date(battle.turn_deadline).getTime() <= Date.now()
      ) {
        const timedOut = battle.current_turn as BattleSideKey;
        const ruling = resolveTimeout(timedOut, Number(battle.control_current ?? 0));
        const turn = nextTurn(timedOut, Number(battle.turn_seconds ?? 90), new Date());
        await sql`
          UPDATE battles
          SET control_current = ${ruling.controlAfter},
              current_turn = ${turn.currentTurn},
              turn_deadline = ${turn.turnDeadline}
          WHERE id = ${id} AND status = 'active'
        `;
        battle.current_turn = turn.currentTurn;
        battle.turn_deadline = turn.turnDeadline;
        battle.control_current = ruling.controlAfter;
      }

      if (battle.current_turn && battle.current_turn !== senderSide) {
        return NextResponse.json(
          { error: "It's not your turn — wait for your opponent's strike." },
          { status: 409 }
        );
      }
    }

    // Determine which round this message belongs to: count this user's
    // existing messages + 1.
    const countRows = await sql`
      SELECT COUNT(*)::int AS count FROM battle_messages
      WHERE battle_id = ${id} AND user_id = ${session.userId}
    `;
    const round = (countRows[0]?.count ?? 0) + 1;

    if (round > battle.rounds) {
      return NextResponse.json(
        { error: `You've already posted all ${battle.rounds} of your roasts for this battle.` },
        { status: 409 }
      );
    }

    // Local moderation gate — run before the message ever touches the DB.
    // Context includes the topic, format, and recent conversation from
    // both sides so the engine can tell competitive roasting apart from
    // real harassment.
    const isSenderCreator = battle.created_by === session.userId;
    const senderUsername = isSenderCreator ? battle.creator_username : battle.opponent_username;
    const opponentUsername = isSenderCreator ? battle.opponent_username : battle.creator_username;

    const recentRows = await sql`
      SELECT bm.user_id, bm.content
      FROM battle_messages bm
      WHERE bm.battle_id = ${id}
      ORDER BY bm.created_at DESC
      LIMIT 10
    `;
    const recentMessages = recentRows
      .filter((r) => r.user_id === session.userId)
      .map((r) => r.content as string);
    const conversationHistory = [...recentRows]
      .reverse()
      .map((r) => ({
        username: r.user_id === battle.created_by ? battle.creator_username : battle.opponent_username,
        content: r.content as string,
      }));

    const verdict = await analyzeMessage(parsed.data.content, {
      recentMessages,
      battleTopic: battle.topic,
      battleType: battle.battle_type,
      mode: battle.mode,
      senderUsername,
      opponentUsername,
      conversationHistory,
    });

    if (verdict.action === "BLOCK") {
      const escalation = await recordModerationEvent({
        userId: session.userId,
        battleId: id,
        messageId: null,
        action: "BLOCK",
        category: verdict.category,
        reason: verdict.reason,
        toxicityScore: verdict.toxicity_score,
        source: verdict.source,
      });

      return NextResponse.json(
        {
          error: "Message blocked. Keep the battle competitive.",
          category: verdict.category,
          reason: verdict.reason,
          toxicity_score: verdict.toxicity_score,
          escalation,
        },
        { status: 422 }
      );
    }

    const inserted = await sql`
      INSERT INTO battle_messages (battle_id, user_id, content, round)
      VALUES (${id}, ${session.userId}, ${parsed.data.content}, ${round})
      RETURNING id, content, round, created_at
    `;

    const escalation = await recordModerationEvent({
      userId: session.userId,
      battleId: id,
      messageId: inserted[0].id,
      action: verdict.action,
      category: verdict.category,
      reason: verdict.reason,
      toxicityScore: verdict.toxicity_score,
      source: verdict.source,
    });

    // Check if both participants have now posted all their rounds —
    // if so, mark the battle as ready for judging.
    const totalsRows = await sql`
      SELECT user_id, COUNT(*)::int AS count
      FROM battle_messages
      WHERE battle_id = ${id}
      GROUP BY user_id
    `;

    const creatorCount = totalsRows.find((r) => r.user_id === battle.created_by)?.count ?? 0;
    const opponentCount = battle.opponent_id
      ? totalsRows.find((r) => r.user_id === battle.opponent_id)?.count ?? 0
      : 0;

    let readyForJudging = false;
    if (
      battle.opponent_id &&
      creatorCount >= battle.rounds &&
      opponentCount >= battle.rounds
    ) {
      await sql`
        UPDATE battles SET status = 'judging', current_turn = NULL, turn_deadline = NULL
        WHERE id = ${id}
          AND status = 'active'
          AND battle_source = 'PLAYER_VS_PLAYER'
      `;
      readyForJudging = true;
    }

    // ── Arena engine: momentum + semantic impact synthesis ──
    // Runs the final judge's own pipeline on the partial transcript (one
    // source of truth) and persists the semantic outcome. A failure here
    // must never lose the message or stall the battle: the strike stays,
    // the turn still passes, only the impact metadata is missing.
    let strikeImpact: StrikeImpact | null = null;
    if (battle.engine_version && battle.opponent_id) {
      const flipTurn = async () => {
        if (readyForJudging) return; // judging UPDATE above already cleared the turn
        const turn = nextTurn(senderSide, Number(battle.turn_seconds ?? 90), new Date());
        await sql`
          UPDATE battles SET current_turn = ${turn.currentTurn}, turn_deadline = ${turn.turnDeadline}
          WHERE id = ${id} AND status = 'active'
        `;
      };
      try {
        const transcript = await sql`
          SELECT user_id, content, round, created_at
          FROM battle_messages
          WHERE battle_id = ${id}
          ORDER BY created_at ASC
        `;
        strikeImpact = await resolveStrike({
          topic: battle.topic,
          title: battle.title,
          battleType: battle.battle_type,
          mode: battle.mode,
          creatorId: battle.created_by,
          opponentId: battle.opponent_id,
          creatorName: battle.creator_username,
          opponentName: battle.opponent_username,
          messages: transcript as unknown as { user_id: string; content: string; round: number; created_at?: string }[],
          previousControl: Number(battle.control_current ?? 0),
        });

        await sql`
          UPDATE battle_messages
          SET impact = ${JSON.stringify(strikeImpact)}, control_after = ${strikeImpact.controlAfter}
          WHERE id = ${inserted[0].id}
        `;
        await sql`
          UPDATE battles SET control_current = ${strikeImpact.controlAfter} WHERE id = ${id}
        `;
        await flipTurn();
      } catch (err) {
        console.error("Arena strike resolution failed (message saved, turn still passes):", err);
        await flipTurn();
      }
    }

    return NextResponse.json({
      message: inserted[0],
      impact: strikeImpact,
      readyForJudging,
      warning:
        verdict.action === "WARN"
          ? {
              message: "Keep attacks focused on arguments, not users.",
              category: verdict.category,
              reason: verdict.reason,
              toxicity_score: verdict.toxicity_score,
            }
          : null,
      escalation,
    });
  } catch (err) {
    console.error("Post battle message error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
