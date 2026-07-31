import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { verifyEmailChangeSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/otp";

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

  const parsed = verifyEmailChangeSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { newEmail, code } = parsed.data;

  try {
    const result = await verifyOtp(session.userId, "email_change", code);

    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "No pending email change request found. Request a new code.",
        expired: "This code has expired. Request a new one.",
        max_attempts: "Too many incorrect attempts. Request a new code.",
        incorrect: "Incorrect code.",
      };
      return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
    }

    if (!result.newEmail || result.newEmail.toLowerCase() !== newEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This code doesn't match the email change you're confirming." },
        { status: 400 }
      );
    }

    // Re-check uniqueness right before committing — someone else could have
    // claimed the email in the gap between request and verify.
    const taken = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${newEmail}) AND id != ${session.userId} LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }

    const rows = await sql`
      UPDATE users
      SET email = ${newEmail}, email_verified = TRUE
      WHERE id = ${session.userId}
      RETURNING user_id::text AS "userId", email
    `;

    return NextResponse.json({ success: true, userId: rows[0].userId, email: rows[0].email });
  } catch (err) {
    console.error("Verify email change error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
