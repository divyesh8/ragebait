import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { TERMS_VERSION } from "@/lib/legal";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Invalid input.", field: firstError?.path[0] },
      { status: 400 }
    );
  }

  const { username, email, password, dob, gender } = parsed.data;

  // Acceptance is recorded against the version the SERVER is currently
  // serving, so a stale or tampered client version can't create a mismatched
  // record. If the client accepted an older version, ask them to re-accept.
  if (parsed.data.policyVersion !== TERMS_VERSION) {
    return NextResponse.json(
      { error: "The Terms have been updated. Please review and accept the current version." },
      { status: 409 }
    );
  }

  // Evidence of acceptance: originating IP and browser/device (user-agent).
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const existing = await sql`
      SELECT id FROM users
      WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username or email is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rows = await sql`
      INSERT INTO users (username, email, password_hash, date_of_birth, gender)
      VALUES (${username}, ${email}, ${passwordHash}, ${dob}, ${gender})
      RETURNING id, user_id::text AS "userId", username, email, gender
    `;

    const user = rows[0];

    // Store the acceptance record as evidence: user id, exact policy version,
    // acceptance timestamp (DB default now()), IP, and browser/device.
    await sql`
      INSERT INTO user_policy_acceptances (user_id, policy_version, ip_address, user_agent)
      VALUES (${user.id}, ${TERMS_VERSION}, ${ipAddress}, ${userAgent})
    `;

    const code = await createOtp(user.id, "signup");
    await sendOtpEmail(user.email, code, "signup");

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email: user.email,
      userId: user.userId,
      gender: user.gender,
      message: `A verification code was sent to ${user.email}.`,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
