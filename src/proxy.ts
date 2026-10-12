import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { COUNTRY_COOKIE, GEO_COOKIE, SESSION_COOKIE } from "@/lib/site";

const CC_RE = /^[a-z]{2}$/;
const DEFAULT_MARKET = (process.env.DEFAULT_MARKET || "rw").toLowerCase();

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/sandberg")) {
    // First gate only: every admin page and server action re-checks the session (lib/auth/dal.ts).
    if (pathname === "/sandberg/login") return NextResponse.next();
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/sandberg/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // "/" → the visitor's market home, without changing the URL. Explicit choice (cookie) wins over
  // geolocation. Unknown or non-market codes render the default market with a canonical to it.
  const geo = (request.headers.get("x-vercel-ip-country") || "").toLowerCase();
  const chosen = (request.cookies.get(COUNTRY_COOKIE)?.value || "").toLowerCase();
  const code = CC_RE.test(chosen) ? chosen : CC_RE.test(geo) ? geo : DEFAULT_MARKET;

  const url = request.nextUrl.clone();
  url.pathname = `/${code}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Cookie, X-Vercel-IP-Country");
  if (CC_RE.test(geo) && request.cookies.get(GEO_COOKIE)?.value !== geo) {
    // Lets the location dialog label the "Detected" country on otherwise static pages.
    res.cookies.set(GEO_COOKIE, geo, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}

export const config = {
  matcher: ["/", "/sandberg/:path*"],
};
