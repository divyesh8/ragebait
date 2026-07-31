import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { AUTH_COOKIE_NAME, signSession } from "@/lib/auth";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  try {
    const rows = await sql`
      SELECT id, user_id::text AS "userId", username, email, password_hash, gender, email_verified,
             account_status, status_reason, status_expires_at
      FROM users
      WHERE LOWER(username) = LOWER(${identifier})
         OR LOWER(email) = LOWER(${identifier})
         OR user_id::text = ${identifier}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "Please enter the correct password." },
        { status: 401 }
      );
    }

    // Creator-panel account enforcement. Checked after password verification
    // so we don't leak account status to someone guessing credentials.
    // Temporary bans lift automatically once status_expires_at passes.
    const banExpired =
      user.account_status === "banned" &&
      user.status_expires_at &&
      new Date(user.status_expires_at).getTime() <= Date.now();

    if (user.account_status === "frozen") {
      return NextResponse.json(
        { error: "This account is currently frozen. Contact support if you believe this is a mistake." },
        { status: 403 }
      );
    }

    if (user.account_status === "banned" && !banExpired) {
      const until = user.status_expires_at
        ? ` until ${new Date(user.status_expires_at).toLocaleString()}`
        : " permanently";
      return NextResponse.json(
        { error: `This account is banned${until}.${user.status_reason ? ` Reason: ${user.status_reason}` : ""}` },
        { status: 403 }
      );
    }

    if (banExpired) {
      await sql`
        UPDATE users SET account_status = 'active', status_reason = NULL, status_expires_at = NULL
        WHERE id = ${user.id}
      `;
    }

    if (!user.email_verified) {
      const code = await createOtp(user.id, "signup");
      await sendOtpEmail(user.email, code, "signup");

      return NextResponse.json(
        {
          error: "Please verify your email first. We sent you a new code.",
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
