import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, signSession } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp";
import { verifySignupOtpSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = verifySignupOtpSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { email, code } = parsed.data;

  try {
    const rows = await sql`
      SELECT id, user_id::text AS "userId", username, gender, email_verified
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "No signup awaiting verification was found." }, { status: 404 });
    }

    const user = rows[0];
    if (user.email_verified) {
      return NextResponse.json({ error: "This account is already verified. Please log in." }, { status: 400 });
    }

    const result = await verifyOtp(user.id, "signup", code);
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "No pending signup code found. Request a new code.",
        expired: "This code has expired. Request a new one.",
        max_attempts: "Too many incorrect attempts. Request a new code.",
        incorrect: "Incorrect code.",
      };
      return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
    }

    await sql`UPDATE users SET email_verified = TRUE WHERE id = ${user.id}`;

    const token = await signSession({ userId: user.id, username: user.username, gender: user.gender ?? null });
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, userId: user.userId, username: user.username, gender: user.gender },
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("Verify signup OTP error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
