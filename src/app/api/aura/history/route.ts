import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT id, amount, reason, battle_id, created_at
      FROM aura_transactions
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ transactions: rows });
  } catch (err) {
    console.error("Aura history error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
