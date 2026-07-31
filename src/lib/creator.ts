import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest, verifySession, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL?.trim().toLowerCase() ?? "";

export function isFounderEmail(email: string | null | undefined): boolean {
  return Boolean(FOUNDER_EMAIL && email?.trim().toLowerCase() === FOUNDER_EMAIL);
}

export async function getFounderStatusForUserId(userId: string): Promise<boolean> {
  if (!FOUNDER_EMAIL) return false;

  const rows = await sql`
    SELECT email
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return isFounderEmail(rows[0]?.email);
}

export async function requireCreatorFromRequest(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return null;

  const isCreator = await getFounderStatusForUserId(session.userId);
  return isCreator ? session : null;
}

export interface CreatorAuditEntry {
  creatorUserId: string;
  targetUserId?: string | null;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason: string;
  req?: NextRequest;
}

/**
 * Append-only audit trail for every founder action. Never expose an update
 * or delete path for creator_audit_logs — immutability is the point.
 */
export async function recordCreatorAction(entry: CreatorAuditEntry): Promise<void> {
  const meta = entry.req ? requestMeta(entry.req) : { ip: null, browser: null, device: null };
  await sql`
    INSERT INTO creator_audit_logs
      (creator_user_id, target_user_id, action, previous_value, new_value, reason, ip_address, browser, device)
    VALUES
      (${entry.creatorUserId}, ${entry.targetUserId ?? null}, ${entry.action},
       ${entry.previousValue === undefined ? null : JSON.stringify(entry.previousValue)},
       ${entry.newValue === undefined ? null : JSON.stringify(entry.newValue)},
       ${entry.reason}, ${meta.ip}, ${meta.browser}, ${meta.device})
  `;
}

function requestMeta(req: NextRequest): { ip: string | null; browser: string | null; device: string | null } {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? "";
  return {
    ip,
    browser: ua.slice(0, 250) || null,
    device: /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : ua ? "Desktop" : null,
  };
}

export async function requireCreatorFromCookies() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const isCreator = await getFounderStatusForUserId(session.userId);
  return isCreator ? session : null;
}
