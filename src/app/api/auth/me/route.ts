import { NextRequest, NextResponse } from "next/server";
import { findUserById } from "@/lib/auth/db";
import { getSessionUser } from "@/lib/auth/session";

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200:
 *         description: The logged-in user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionUser(request);

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get full user details from database
    const user = await findUserById(session.id);

    if (!user) {
      // Session valid but user not in DB (guest/break-glass) - return session data
      return NextResponse.json({
        user: {
          id: session.id,
          username: session.username,
          role: session.role,
        },
      });
    }

    // Return user without password
    const { password: _password, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
