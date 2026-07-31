import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.userId} LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const validPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 401 });
    }

    const sameAsOld = await bcrypt.compare(newPassword, rows[0].password_hash);
    if (sameAsOld) {
      return NextResponse.json({ error: "New password must be different from your current one." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${session.userId}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
