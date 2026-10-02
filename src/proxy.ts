/**
 * Global authentication proxy (Next.js middleware convention).
 *
 * Every page and API route requires a valid session cookie (a JWT signed
 * with JWT_SECRET) except the public paths below. Pages redirect to /login;
 * API routes get a 401. Set DISABLE_AUTH=true to bypass all checks.
 *
 * Verification uses jose because this runs on the edge runtime, where
 * jsonwebtoken's Node crypto isn't available. Tokens are issued by
 * /api/auth/login via src/lib/auth/jwt.ts — same secret, same HS256.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/config";

// Paths reachable without a session
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/config",
  "/api/health",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function continueRequest(pathname: string): NextResponse {
  const response = NextResponse.next();
  if (
    pathname.startsWith("/api/data/")
    || pathname.startsWith("/api/preferences")
    || pathname === "/api/auth/me"
    || pathname === "/api/health"
  ) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.DISABLE_AUTH === "true") {
    return continueRequest(pathname);
  }

  if (isPublicPath(pathname)) {
    return continueRequest(pathname);
  }

  const token = request.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(getJwtSecret()), {
        algorithms: ["HS256"],
        issuer: "cdms",
        audience: "cdms",
      });
      return continueRequest(pathname);
    } catch {
      // Invalid or expired token — treat as unauthenticated
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|smaller_logo\\.png).*)",
  ],
};
