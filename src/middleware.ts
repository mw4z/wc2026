import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "wc26_session";

// Routes that require any authenticated user.
const PROTECTED = ["/dashboard", "/matches", "/leaderboard", "/profile", "/admin"];
// Routes that additionally require ADMIN.
const ADMIN_ONLY = ["/admin"];

async function readSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string; name: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsAuth) return NextResponse.next();

  const session = await readSession(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const needsAdmin = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (needsAdmin && session.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/matches";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Apply to app routes only (skip static assets & API — API does its own checks).
  matcher: ["/dashboard/:path*", "/matches/:path*", "/leaderboard/:path*", "/profile/:path*", "/admin/:path*"],
};
