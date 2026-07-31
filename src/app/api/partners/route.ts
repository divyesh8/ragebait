import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import {
  countMutualPartners,
  getRelationship,
  publicStatus,
  rankForAura,
  searchPlayers,
  toPlayerSearchResult,
  type PartnerCard,
} from "@/services/socialGraph";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    await touchActivity(session.userId, "Browsing");

    const [receivedRows, sentRows, partnerRows, suggestions] = await Promise.all([
      sql`
        SELECT
          pr.id AS request_id,
          pr.status,
          pr.created_at AS request_created_at,
          u.id,
          u.user_id::text AS "userId",
          u.username,
          u.avatar_url,
          u.bio,
          u.country,
          u.languages,
          u.favorite_battle_category,
          u.show_online_status,
          u.show_last_seen,
          u.last_active_at,
          u.current_activity,
          u.aura,
          u.level,
          u.wins,
          u.losses,
          COALESCE(ps.draws, 0) AS draws,
          ps.most_used_battle_category
        FROM partner_requests pr
        JOIN users u ON u.id = pr.requester_id
        LEFT JOIN profile_statistics ps ON ps.user_id = u.id
        WHERE pr.recipient_id = ${session.userId} AND pr.status = 'pending'
        ORDER BY pr.created_at DESC
        LIMIT 50
      `,
      sql`
        SELECT
          pr.id AS request_id,
          pr.status,
          pr.created_at AS request_created_at,
          u.id,
          u.user_id::text AS "userId",
          u.username,
          u.avatar_url,
          u.bio,
          u.country,
          u.languages,
          u.favorite_battle_category,
          u.show_online_status,
          u.show_last_seen,
          u.last_active_at,
          u.current_activity,
          u.aura,
          u.level,
          u.wins,
          u.losses,
          COALESCE(ps.draws, 0) AS draws,
          ps.most_used_battle_category
        FROM partner_requests pr
        JOIN users u ON u.id = pr.recipient_id
        LEFT JOIN profile_statistics ps ON ps.user_id = u.id
        WHERE pr.requester_id = ${session.userId} AND pr.status = 'pending'
        ORDER BY pr.created_at DESC
        LIMIT 50
      `,
      sql`
        SELECT
          p.created_at AS partnered_at,
          u.id,
          u.user_id::text AS "userId",
          u.username,
          u.avatar_url,
          u.country,
          u.show_online_status,
          u.show_last_seen,
          u.last_active_at,
          u.current_activity,
          u.aura,
          u.level
        FROM partners p
        JOIN users u ON u.id = CASE WHEN p.user_low_id = ${session.userId} THEN p.user_high_id ELSE p.user_low_id END
        WHERE p.user_low_id = ${session.userId} OR p.user_high_id = ${session.userId}
        ORDER BY p.created_at DESC
        LIMIT 100
      `,
      searchPlayers("a", session.userId, 6).catch(() => []),
    ]);

    const received = await Promise.all(
      receivedRows.map(async (row) => ({
        id: String(row.request_id),
        status: String(row.status),
        createdAt: String(row.request_created_at),
        user: await toPlayerSearchResult(row, session.userId),
      }))
    );

    const sent = await Promise.all(
      sentRows.map(async (row) => ({
        id: String(row.request_id),
        status: String(row.status),
        createdAt: String(row.request_created_at),
        user: await toPlayerSearchResult(row, session.userId),
      }))
    );

    const partners: PartnerCard[] = await Promise.all(
      partnerRows.map(async (row) => {
        const aura = Number(row.aura ?? 0);
        return {
          id: String(row.id),
          userId: String(row.userId),
          username: String(row.username),
          avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
          country: String(row.country ?? "Unknown"),
          aura,
          level: Number(row.level ?? 1),
          rank: rankForAura(aura),
          status: publicStatus(row),
          lastActive: row.show_last_seen === false ? null : row.last_active_at ? String(row.last_active_at) : null,
          currentActivity: String(row.current_activity ?? "Browsing"),
          mutualPartners: await countMutualPartners(session.userId, String(row.id)),
          partneredAt: String(row.partnered_at),
        };
      })
    );

    return NextResponse.json({ received, sent, partners, suggestions });
  } catch (err) {
    console.error("Partners list error:", err);
    return NextResponse.json({ error: "Unable to load partners." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const identity = String(body.targetUserId ?? body.identity ?? "").trim().replace(/^@/, "");
  if (!identity) return NextResponse.json({ error: "Choose a player first." }, { status: 400 });

  try {
    const targets = await sql`
      SELECT id, user_id::text AS "userId", username, partner_request_policy
      FROM users
      WHERE id::text = ${identity}
         OR user_id::text = ${identity}
         OR LOWER(username) = LOWER(${identity})
      LIMIT 1
    `;

    if (targets.length === 0) return NextResponse.json({ error: "Player not found." }, { status: 404 });
    const target = targets[0];
    const targetId = String(target.id);
    if (targetId === session.userId) return NextResponse.json({ error: "You are already your own best teammate." }, { status: 400 });

    const relationship = await getRelationship(session.userId, targetId);
    if (relationship.relationship === "blocked") return NextResponse.json({ error: "Request unavailable." }, { status: 403 });
    if (relationship.relationship === "partner") return NextResponse.json({ relationship: "partner" });
    if (relationship.relationship === "outgoing_request") {
      return NextResponse.json({ relationship: "outgoing_request", requestId: relationship.pendingRequestId });
    }

    if (target.partner_request_policy === "nobody") {
      return NextResponse.json({ error: "This player is not accepting partner requests." }, { status: 403 });
    }
    if (target.partner_request_policy === "partners_only") {
      return NextResponse.json({ error: "This player only accepts requests from partners-only circles." }, { status: 403 });
    }

    if (relationship.relationship === "incoming_request" && relationship.pendingRequestId) {
      await acceptRequest(relationship.pendingRequestId, session.userId, targetId);
      return NextResponse.json({ relationship: "partner" }, { status: 201 });
    }

    const rows = await sql`
      INSERT INTO partner_requests (requester_id, recipient_id, message)
      VALUES (${session.userId}, ${targetId}, ${String(body.message ?? "").slice(0, 240) || null})
      ON CONFLICT (requester_id, recipient_id) WHERE status = 'pending'
      DO UPDATE SET created_at = partner_requests.created_at
      RETURNING id
    `;

    await createNotification({
      userId: targetId,
      type: "partner_request_received",
      title: "Partner request received",
      body: `${session.username} wants to partner up.`,
      actorId: session.userId,
    });

    return NextResponse.json({ relationship: "outgoing_request", requestId: rows[0]?.id }, { status: 201 });
  } catch (err) {
    console.error("Send partner request error:", err);
    return NextResponse.json({ error: "Unable to send partner request." }, { status: 500 });
  }
}

async function acceptRequest(requestId: string, recipientId: string, requesterId: string) {
  await sql`
    UPDATE partner_requests
    SET status = 'accepted', responded_at = now()
    WHERE id = ${requestId} AND recipient_id = ${recipientId} AND status = 'pending'
  `;
  await sql`
    INSERT INTO partners (user_low_id, user_high_id)
    VALUES (LEAST(${requesterId}::uuid, ${recipientId}::uuid), GREATEST(${requesterId}::uuid, ${recipientId}::uuid))
    ON CONFLICT (user_low_id, user_high_id) DO NOTHING
  `;
  await createNotification({
    userId: requesterId,
    type: "partner_request_accepted",
    title: "Partner request accepted",
    body: "You have a new partner.",
    actorId: recipientId,
  });
}

async function touchActivity(userId: string, activity: string) {
  await sql`
    UPDATE users
    SET last_active_at = now(), current_activity = ${activity}
    WHERE id = ${userId}
  `;
  await sql`
    INSERT INTO user_activity (user_id, status, current_activity, last_seen_at, updated_at)
    VALUES (${userId}, 'browsing', ${activity}, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'browsing',
      current_activity = EXCLUDED.current_activity,
      last_seen_at = now(),
      updated_at = now()
  `;
}
