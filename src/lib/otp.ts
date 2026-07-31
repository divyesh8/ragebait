import crypto from "crypto";
import { sql } from "@/lib/db";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  // Cryptographically random 6-digit code, zero-padded.
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return n.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Creates a fresh OTP for a user + purpose, invalidating any previous
 * unconsumed codes for that same purpose. Returns the plaintext code
 * (only ever returned here, so the caller can email it — never stored
 * in plaintext).
 */
export async function createOtp(
  userId: string,
  purpose: string,
  opts: { newEmail?: string } = {}
): Promise<string> {
  await sql`
    UPDATE otp_codes SET consumed = TRUE
    WHERE user_id = ${userId} AND purpose = ${purpose} AND consumed = FALSE
  `;

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO otp_codes (user_id, purpose, code_hash, new_email, expires_at)
    VALUES (${userId}, ${purpose}, ${codeHash}, ${opts.newEmail ?? null}, ${expiresAt.toISOString()})
  `;

  return code;
}

export type OtpVerifyResult =
  | { ok: true; newEmail: string | null }
  | { ok: false; reason: "not_found" | "expired" | "max_attempts" | "incorrect" };

/**
 * Verifies a submitted code against the most recent unconsumed OTP for this
 * user + purpose. Tracks attempts and consumes the code on success.
 */
export async function verifyOtp(
  userId: string,
  purpose: string,
  submittedCode: string
): Promise<OtpVerifyResult> {
  const rows = await sql`
    SELECT id, code_hash, new_email, attempts, expires_at
    FROM otp_codes
    WHERE user_id = ${userId} AND purpose = ${purpose} AND consumed = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return { ok: false, reason: "not_found" };
  const row = rows[0];

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "max_attempts" };
  }

  const submittedHash = hashCode(submittedCode.trim());
  if (submittedHash !== row.code_hash) {
    await sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${row.id}`;
    return { ok: false, reason: "incorrect" };
  }

  await sql`UPDATE otp_codes SET consumed = TRUE WHERE id = ${row.id}`;
  return { ok: true, newEmail: row.new_email ?? null };
}
