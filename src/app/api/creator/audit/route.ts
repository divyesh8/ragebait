import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";

export const dynamic = "force-dynamic";

// GET /api/creator/audit?search= — read-only view of the append-only audit trail.
// There is intentionally no POST/PATCH/DELETE here: audit rows are immutable.
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const rows = search
    ? await sql`
        SELECT al.id, al.action, al.previous_value, al.new_value, al.reason,
               al.ip_address, al.browser, al.device, al.undo_status, al.created_at,
               target.username AS target_username
        FROM creator_audit_logs al
        LEFT JOIN users target ON target.id = al.target_user_id
        WHERE al.action ILIKE ${"%" + search + "%"}
           OR al.reason ILIKE ${"%" + search + "%"}
           OR target.username ILIKE ${"%" + search + "%"}
        ORDER BY al.created_at DESC
        LIMIT 100
      `
    : await sql`
        SELECT al.id, al.action, al.previous_value, al.new_value, al.reason,
               al.ip_address, al.browser, al.device, al.undo_status, al.created_at,
               target.username AS target_username
        FROM creator_audit_logs al
        LEFT JOIN users target ON target.id = al.target_user_id
        ORDER BY al.created_at DESC
        LIMIT 100
      `;

  return NextResponse.json({ logs: rows });
}
