import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { AUTH_COOKIE_NAME, getSessionFromRequest, signSession } from "@/lib/auth";
import { changeUsernameSchema } from "@/lib/validation";

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

  const parsed = changeUsernameSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { newUsername, currentPassword } = parsed.data;

  try {
    const rows = await sql`
      SELECT id, user_id::text AS "userId", username, password_hash, gender
      FROM users
      WHERE id = ${session.userId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const user = rows[0];

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    if (newUsername.toLowerCase() === user.username.toLowerCase()) {
      return NextResponse.json({ error: "That's already your username." }, { status: 400 });
    }

    const taken = await sql`
      SELECT id FROM users WHERE LOWER(username) = LOWER(${newUsername}) AND id != ${session.userId} LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    await sql`UPDATE users SET username = ${newUsername} WHERE id = ${session.userId}`;

    // Username is embedded in the session JWT, so re-issue the cookie with
    // the new value — otherwise the old username would linger until next login.
    const token = await signSession({ userId: session.userId, username: newUsername, gender: user.gender ?? null });
    const res = NextResponse.json({ success: true, userId: user.userId, username: newUsername });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("Change username error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
