import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { requestEmailChangeSchema } from "@/lib/validation";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

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

  const parsed = requestEmailChangeSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { newEmail, currentPassword } = parsed.data;

  try {
    const rows = await sql`SELECT password_hash, email FROM users WHERE id = ${session.userId} LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const user = rows[0];

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: "That's already your email." }, { status: 400 });
    }

    const taken = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${newEmail}) AND id != ${session.userId} LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }

    const code = await createOtp(session.userId, "email_change", { newEmail });
    await sendOtpEmail(newEmail, code, "email_change");

    return NextResponse.json({
      success: true,
      message: `A verification code was sent to ${newEmail}.`,
    });
  } catch (err) {
    console.error("Request email change error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
