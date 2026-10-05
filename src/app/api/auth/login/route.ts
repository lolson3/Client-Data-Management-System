import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/db";
import { generateToken, getSessionMaxAgeSeconds } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { clearLoginFailures, loginRetryAfterSeconds, recordLoginFailure } from "@/lib/auth/login-rate-limit";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with username and password
 *     description: On success, sets the httpOnly `session` cookie (a signed JWT) used by all other endpoints.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: patrick }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Logged in — `session` cookie set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400: { description: Username and password are required }
 *       401: { description: Invalid username or password }
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const { username, password } = body;
    const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const rateLimitKey = `${clientAddress}:${String(username || "").trim().toLowerCase()}`;
    const retryAfter = loginRetryAfterSeconds(rateLimitKey);
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Validate input
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials against auth.db
    const user = await verifyPassword(username, password);

    if (!user) {
      recordLoginFailure(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    clearLoginFailures(rateLimitKey);

    // Create signed session token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || "user",
    });

    // Create response with user info
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    // Set session cookie (HTTP-only for security)
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      priority: "high",
      maxAge: getSessionMaxAgeSeconds(),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
