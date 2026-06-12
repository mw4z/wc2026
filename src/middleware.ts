import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "wc26_session";

// Social/link-preview crawlers — let them reach /join so they read its OG tags
// instead of being redirected to /login (which would show the wrong preview).
const CRAWLER =
  /(facebookexternalhit|whatsapp|twitterbot|telegrambot|telegram|linkedinbot|slackbot|discordbot|googlebot|bingbot|embedly|pinterest|redditbot|skypeuripreview|vkshare|whatsapp\/|facebot)/i;

// Routes that require any authenticated user.
const PROTECTED = ["/dashboard", "/matches", "/groups", "/leaderboard", "/profile", "/admin"];
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

  // Invite links: /join/CODE. A logged-out visitor can't set a cookie from the
  // page (server components can't write cookies), so do it here — stash the code
  // in a short-lived cookie and send them through normal login. After signup
  // they land on /matches and the form pre-fills the code. Logged-in users fall
  // through to the page, where AutoJoin joins immediately.
  const inviteMatch = pathname.match(/^\/join\/([^/]+)\/?$/);
  if (inviteMatch) {
    const code = inviteMatch[1] ?? "";
    const session = await readSession(req);
    if (!session) {
      // Let link-preview crawlers render the page (for OG tags) instead of redirecting.
      if (CRAWLER.test(req.headers.get("user-agent") || "")) return NextResponse.next();
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      const res = NextResponse.redirect(url);
      res.cookies.set("wc26_invite", decodeURIComponent(code), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 30, // 30 minutes
        path: "/",
      });
      return res;
    }
    return NextResponse.next();
  }

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
  matcher: ["/join/:path*", "/dashboard/:path*", "/matches/:path*", "/groups/:path*", "/leaderboard/:path*", "/profile/:path*", "/admin/:path*"],
};
