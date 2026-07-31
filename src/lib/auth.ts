import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { isGender, type Gender } from "@/lib/gender";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_insecure_secret_change_me";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "ragebait_session";

export interface SessionPayload {
  userId: string;
  username: string;
  gender?: Gender | null;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId === "string" && typeof payload.username === "string") {
      if (payload.gender === undefined || payload.gender === null) {
        return { userId: payload.userId, username: payload.username, gender: null };
      }

      if (isGender(payload.gender)) {
        return { userId: payload.userId, username: payload.username, gender: payload.gender };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convenience helper for API routes: reads the session cookie from a
 * NextRequest and returns the decoded payload, or null if missing/invalid.
 */
export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
