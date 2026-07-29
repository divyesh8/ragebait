import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes anyone can load without a session.
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/battles",        // list + detail
  "/profile",        // public profiles
  "/leaderboard",    // rankings
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// Routes that always require a session regardless of method.
const PROTECTED_PREFIXES = [
  "/settings",
  "/create-battle",
  "/notifications",
  "/invites",
  "/groups",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  // Auth pages: redirect logged-in users to home.
  if (pathname === "/login" || pathname === "/signup") {
    if (session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Explicitly public pages — pass through regardless of auth.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Explicitly protected pages — bounce to /login.
  if (isProtectedPath(pathname)) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // All other pages (home, profile/self, etc.) — protect by default.
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|avatars|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)",
  ],
};
