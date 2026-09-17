/**
 * ARCHIVO DE EJEMPLO: Endpoint de login con rate limiting
 * Ubicación: app/api/auth/login/route.ts
 * 
 * Este archivo es un ejemplo de cómo aplicar rate limiting en un endpoint de login.
 * Adáptalo según tu configuración actual de autenticación.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, resetRateLimit } from "../../../lib/rate-limit";

// Obtener IP real del cliente
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y password son requeridos" },
        { status: 400 }
      );
    }

    // ⚠️ Obtener IP del cliente
    const clientIp = getClientIp(req);
    
    // 🔒 Rate limit por IP: 10 intentos por 10 minutos
    const ipRateLimit = await checkRateLimit(
      clientIp,
      "login",
      10,
      10 * 60 * 1000 // 10 minutos
    );
    
    if (!ipRateLimit.allowed) {
      console.warn(`[login] Rate limit excedido para IP: ${clientIp}`);
      return NextResponse.json(
        {
          error: "Demasiados intentos de login. Por favor, intenta más tarde.",
          retryAfter: ipRateLimit.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(ipRateLimit.retryAfter || 600) } }
      );
    }

    // ====================
    // AQUÍ VA TU LÓGICA DE LOGIN
    // ====================
    // Ejemplo con Firebase:
    // const { data, error } = await someAuthMethod(email, password);
    // if (error) throw error;
    
    // SIMULACIÓN - reemplaza con tu lógica:
    const loginSuccess = true; // Cambiar según tu lógica real
    
    if (!loginSuccess) {
      throw new Error("Credenciales inválidas");
    }

    // ✅ Login exitoso: resetear rate limit
    await resetRateLimit(clientIp, "login");

    console.log(`[login] Login exitoso: ${email}`);

    return NextResponse.json({ 
      success: true,
      message: "Login exitoso",
      // incluir token, uid, etc según tu app
    });

  } catch (err: any) {
    console.error("[login] Error:", err);
    
    return NextResponse.json(
      { error: err.message || "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
