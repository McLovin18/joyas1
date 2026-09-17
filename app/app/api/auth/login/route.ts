import { NextResponse } from "next/server";
import { adminAuth } from "../../../lib/firebase-admin";

// MEMORY RATE LIMIT

const requests = new Map();

function rateLimit(ip: string) {
  const now = Date.now();
  const limit = requests.get(ip) || [];
  const recent = limit.filter((t: number) => now - t < 60000);
  recent.push(now);
  requests.set(ip, recent);
  return recent.length > 5;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // RATE LIMIT

    if (rateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },

        { status: 429 },
      );
    }

    const { idToken } = await req.json();

    // VERIFY FIREBASE TOKEN
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as any).admin !== true) {
      return NextResponse.json(
        { error: "Solo el administrador puede iniciar sesión en esta tienda." },
        { status: 403 },
      );
    }
    // SESSION COOKIE

    const expires = 1000 * 60 * 60 * 24 * 5;

    const session = await adminAuth.createSessionCookie(
      idToken,

      { expiresIn: expires },
    );

    const userRole = "admin";

    const response = NextResponse.json({
      success: true,

      role: userRole,
    });

    // COOKIE HTTP ONLY

    response.cookies.set(
      "session",

      session,

      {
        httpOnly: true,

        secure: process.env.NODE_ENV === "production",

        sameSite: "lax",

        path: "/",

        maxAge: expires / 1000,
      },
    );

    // Cookie adicional con el rol para leerlo fácilmente en middleware (Edge)
    response.cookies.set(
      "role",
      userRole,
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: expires / 1000,
      },
    );

    return response;
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: "Unauthorized" },

      { status: 401 },
    );
  }
}
