import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../lib/firebase-admin";
import { checkRateLimit, markRegistrationSuccess, isEmailRegistrationBlocked, normalizeIp } from "../../../lib/rate-limit-v2";

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || "unknown");
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y password son requeridos" }, { status: 400 });
    }

    // Obtener IP del cliente
    const ip = normalizeIp(getClientIp(req));
    
    // CHEQUEO 1: ¿Está este email bloqueado por registro previo?
    const isBlocked = await isEmailRegistrationBlocked(email.trim().toLowerCase());
    if (isBlocked) {
      console.warn(`[create-account] Email ya registrado recientemente: ${email}`);
      return NextResponse.json(
        {
          error: "Este email se registró recientemente. Intenta en 5 minutos.",
          retryAfter: 300,
        },
        { status: 429, headers: { "Retry-After": "300" } }
      );
    }
    
    // CHEQUEO 2: Multi-capa rate limit (Email + IP)
    const rateLimit = await checkRateLimit(
      email.trim().toLowerCase(),
      ip,
      "register"
    );
    
    if (!rateLimit.allowed) {
      console.warn(`[create-account] Rate limit: ${rateLimit.reason}`);
      return NextResponse.json(
        {
          error: rateLimit.reason,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 300) } }
      );
    }

    // Crear usuario
    const userRecord = await adminAuth.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      displayName: displayName?.trim() || undefined,
      emailVerified: false,
    });

    // ÉXITO: Bloquear email por 7 días (anti-spam)
    await markRegistrationSuccess(email.trim().toLowerCase(), 7);

    console.log(`[create-account] ✅ ${userRecord.email}`);

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
    });

  } catch (err: any) {
    console.error("[create-account] Error:", err);
    
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }
    if (err.code === "auth/invalid-password") {
      return NextResponse.json({ error: "Contraseña muy corta" }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Error al crear cuenta" },
      { status: 500 }
    );
  }
}
