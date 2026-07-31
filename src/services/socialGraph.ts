import { sql } from "@/lib/db";

export type PartnerRelationship =
  | "self"
  | "partner"
  | "incoming_request"
  | "outgoing_request"
  | "blocked"
  | "none";

export interface PlayerSearchResult {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string;
  languages: string[];
  aura: number;
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  totalBattles: number;
  rank: string;
  favoriteBattleCategory: string;
  status: "Online" | "Offline" | "In Battle" | "Training" | "Browsing";
  lastActive: string | null;
  relationship: PartnerRelationship;
  pendingRequestId: string | null;
  mutualPartners: number;
}

export interface PartnerCard {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  aura: number;
  level: number;
  rank: string;
  status: "Online" | "Offline" | "In Battle" | "Training" | "Browsing";
  lastActive: string | null;
  currentActivity: string;
  mutualPartners: number;
  partneredAt: string;
}

export interface PartnerRequestCard {
  id: string;
  user: PlayerSearchResult;
  status: string;
  createdAt: string;
}

export function rankForAura(aura: number): string {
  if (aura >= 5000) return "Mythic";
  if (aura >= 2500) return "Diamond";
  if (aura >= 1200) return "Platinum";
  if (aura >= 600) return "Gold";
  if (aura >= 250) return "Silver";
  return "Bronze";
}

export function publicStatus(row: {
  show_online_status?: boolean | null;
  last_active_at?: string | Date | null;
  current_activity?: string | null;
}): "Online" | "Offline" | "In Battle" | "Training" | "Browsing" {
  if (row.show_online_status === false) return "Offline";
  const activity = String(row.current_activity ?? "Browsing");
  if (/battle/i.test(activity)) return "In Battle";
  if (/training/i.test(activity)) return "Training";

  const lastActive = row.last_active_at ? new Date(row.last_active_at).getTime() : 0;
  const onlineWindowMs = 5 * 60 * 1000;
  if (lastActive && Date.now() - lastActive <= onlineWindowMs) return "Online";
  if (/browsing/i.test(activity)) return "Browsing";
  return "Offline";
}

export function parseLanguages(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).slice(0, 6);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).slice(0, 6);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 6);
    }
  }
  return ["English"];
}

export async function getRelationship(viewerId: string | null, targetId: string): Promise<{
  relationship: PartnerRelationship;
  pendingRequestId: string | null;
}> {
  if (!viewerId) return { relationship: "none", pendingRequestId: null };
  if (viewerId === targetId) return { relationship: "self", pendingRequestId: null };

  const [blocked, partner, outgoing, incoming] = await Promise.all([
    sql`
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = ${viewerId} AND blocked_user_id = ${targetId})
         OR (blocker_id = ${targetId} AND blocked_user_id = ${viewerId})
      LIMIT 1
    `,
    sql`
      SELECT id FROM partners
      WHERE user_low_id = LEAST(${viewerId}::uuid, ${targetId}::uuid)
        AND user_high_id = GREATEST(${viewerId}::uuid, ${targetId}::uuid)
      LIMIT 1
    `,
    sql`
      SELECT id FROM partner_requests
      WHERE requester_id = ${viewerId}
        AND recipient_id = ${targetId}
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sql`
      SELECT id FROM partner_requests
      WHERE requester_id = ${targetId}
        AND recipient_id = ${viewerId}
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `,
  ]);

  if (blocked.length) return { relationship: "blocked", pendingRequestId: null };
  if (partner.length) return { relationship: "partner", pendingRequestId: null };
  if (incoming.length) return { relationship: "incoming_request", pendingRequestId: String(incoming[0].id) };
  if (outgoing.length) return { relationship: "outgoing_request", pendingRequestId: String(outgoing[0].id) };
  return { relationship: "none", pendingRequestId: null };
}

export async function countMutualPartners(viewerId: string | null, targetId: string): Promise<number> {
  if (!viewerId || viewerId === targetId) return 0;
  const rows = await sql`
    WITH viewer_partners AS (
      SELECT CASE WHEN user_low_id = ${viewerId} THEN user_high_id ELSE user_low_id END AS partner_id
      FROM partners
      WHERE user_low_id = ${viewerId} OR user_high_id = ${viewerId}
    ),
    target_partners AS (
      SELECT CASE WHEN user_low_id = ${targetId} THEN user_high_id ELSE user_low_id END AS partner_id
      FROM partners
      WHERE user_low_id = ${targetId} OR user_high_id = ${targetId}
    )
    SELECT COUNT(*)::int AS count
    FROM viewer_partners vp
    JOIN target_partners tp ON tp.partner_id = vp.partner_id
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function toPlayerSearchResult(row: any, viewerId: string | null): Promise<PlayerSearchResult> {
  const wins = Number(row.wins ?? 0);
  const losses = Number(row.losses ?? 0);
  const totalBattles = wins + losses + Number(row.draws ?? 0);
  const relationship = await getRelationship(viewerId, String(row.id));
  const mutualPartners = await countMutualPartners(viewerId, String(row.id));
  const aura = Number(row.aura ?? 0);

  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id ?? row.public_id),
    username: String(row.username),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: row.bio ? String(row.bio) : null,
    country: String(row.country ?? "Unknown"),
    languages: parseLanguages(row.languages),
    aura,
    level: Number(row.level ?? 1),
    wins,
    losses,
    winRate: totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0,
    totalBattles,
    rank: rankForAura(aura),
    favoriteBattleCategory: String(row.favorite_battle_category ?? row.most_used_battle_category ?? "Debate"),
    status: publicStatus(row),
    lastActive: row.show_last_seen === false ? null : row.last_active_at ? String(row.last_active_at) : null,
    relationship: relationship.relationship,
    pendingRequestId: relationship.pendingRequestId,
    mutualPartners,
  };
}

export async function searchPlayers(query: string, viewerId: string | null, limit = 8): Promise<PlayerSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const like = `%${q}%`;
  const rows = await sql`
    SELECT
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
    FROM users u
    LEFT JOIN profile_statistics ps ON ps.user_id = u.id
    WHERE u.profile_visibility <> 'private'
      AND (
        u.user_id::text = ${q}
        OR LOWER(u.username) = LOWER(${q})
        OR u.username ILIKE ${like}
        OR u.user_id::text ILIKE ${like}
      )
    ORDER BY
      CASE
        WHEN u.user_id::text = ${q} THEN 0
        WHEN LOWER(u.username) = LOWER(${q}) THEN 1
        ELSE 2
      END,
      u.aura DESC,
      u.username ASC
    LIMIT ${limit}
  `;

  return Promise.all(rows.map((row) => toPlayerSearchResult(row, viewerId)));
}

export async function listPartnerIds(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT CASE WHEN user_low_id = ${userId} THEN user_high_id ELSE user_low_id END AS partner_id
    FROM partners
    WHERE user_low_id = ${userId} OR user_high_id = ${userId}
  `;
  return rows.map((row) => String(row.partner_id));
}

export async function ensurePlayerSearchIndex(userId?: string) {
  const rows = userId
    ? await sql`
        SELECT id, user_id::text AS public_user_id, username, country, aura
        FROM users
        WHERE id = ${userId}
      `
    : await sql`
        SELECT id, user_id::text AS public_user_id, username, country, aura
        FROM users
        ORDER BY created_at DESC
        LIMIT 250
      `;

  for (const row of rows) {
    const aura = Number(row.aura ?? 0);
    await sql`
      INSERT INTO player_search_index
        (user_id, username, public_user_id, country, rank_label, aura, searchable_text, indexed_at)
      VALUES
        (
          ${row.id},
          ${row.username},
          ${row.public_user_id},
          ${row.country ?? "Unknown"},
          ${rankForAura(aura)},
          ${aura},
          ${`${row.username} ${row.public_user_id} ${row.country ?? ""} ${rankForAura(aura)}`},
          now()
        )
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        public_user_id = EXCLUDED.public_user_id,
        country = EXCLUDED.country,
        rank_label = EXCLUDED.rank_label,
        aura = EXCLUDED.aura,
        searchable_text = EXCLUDED.searchable_text,
        indexed_at = now()
    `;
  }
}
