import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest } from "@/lib/creator";
import { normalizeGender } from "@/lib/gender";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const genderParam = req.nextUrl.searchParams.get("gender");
  const genderFilter = genderParam && genderParam !== "all" ? normalizeGender(genderParam) : null;
  if (genderParam && genderParam !== "all" && !genderFilter) {
    return NextResponse.json({ error: "Invalid gender filter." }, { status: 400 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const like = `%${q}%`;

  const rows = await sql`
    SELECT
      user_id::text AS public_id,
      username,
      email,
      gender,
      show_gender_on_public_profile,
      email_verified,
      aura,
      level,
      xp,
      wins,
      losses,
      account_status,
      created_at
    FROM users
    WHERE (${genderFilter}::text IS NULL OR gender = ${genderFilter})
      AND (
        ${q} = ''
        OR username ILIKE ${like}
        OR email ILIKE ${like}
        OR gender ILIKE ${like}
        OR user_id::text = ${q}
        OR id::text = ${q}
      )
    ORDER BY created_at DESC
    LIMIT 10000
  `;

  const headers = [
    "public_id",
    "username",
    "email",
    "gender",
    "show_gender_on_public_profile",
    "email_verified",
    "aura",
    "level",
    "xp",
    "wins",
    "losses",
    "account_status",
    "created_at",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ragebait-users-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
