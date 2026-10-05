import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out
 *     description: Clears the `session` cookie. Works with or without a valid session.
 *     security: []
 *     responses:
 *       200: { description: Logged out — session cookie cleared }
 */
export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear the session cookie
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    priority: "high",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  return response;
}
