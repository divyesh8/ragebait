import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { createOtp } from "@/lib/otp";
import { requestSignupOtpSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSignupOtpSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const rows = await sql`
      SELECT id, email, email_verified
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

    const code = await createOtp(user.id, "signup");
    await sendOtpEmail(user.email, code, "signup");

    return NextResponse.json({
      success: true,
      message: `A new verification code was sent to ${user.email}.`,
    });
  } catch (err) {
    console.error("Request signup OTP error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
