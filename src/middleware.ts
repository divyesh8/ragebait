import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// The ONLY routes a logged-out user may load. Everything else requires a session.
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  if (isPublicPath(pathname)) {
    // Already logged in? Don't show the login/signup screen — go to the dashboard.
    if (session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Every other page is protected. No session → bounce to /login, remembering
  // where the user was headed so we can send them back after they log in.
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Run on every request except Next.js internals, static assets, and the API
// (API routes enforce their own auth per-handler and must stay reachable so
// the client can call /api/auth/login, /api/auth/logout, etc.).
export const config = {
  matcher: ["/((?!api|avatars|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)"],
};
