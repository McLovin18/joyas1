/**
 * CLIENTE: Generar y enviar Device ID persistente
 * 
 * Este archivo muestra cómo el CLIENTE debe:
 * 1. Generar un UUID único
 * 2. Guardarlo en localStorage
 * 3. Enviarlo en cada request de auth
 */

// Generar UUID v4
export function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Obtener o crear Device ID
export function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem("deviceId");
  if (stored) {
    return stored;
  }
  
  const newId = generateDeviceId();
  localStorage.setItem("deviceId", newId);
  return newId;
}

export function getOrCreateSessionId(): string {
  const stored = sessionStorage.getItem("sessionId");
  if (stored) {
    return stored;
  }

  const newId = generateDeviceId();
  sessionStorage.setItem("sessionId", newId);
  return newId;
}

// Helper para registrarse
export async function registerWithRateLimit(email: string, password: string, displayName: string) {
  const deviceId = getOrCreateDeviceId();
  
  const response = await fetch("/api/auth/create-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": deviceId, // ← ENVIAR EL DEVICE ID
    },
    body: JSON.stringify({
      email,
      password,
      displayName,
    }),
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Error en registro");
  }
  
  const result = await response.json();

  // Enviar email de verificación
  try {
    const emailRes = await fetch("/api/auth/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: result.email }),
    });

    if (!emailRes.ok) {
      console.warn("[registerWithRateLimit] Error enviando email de verificación");
      // No lanzar error, la cuenta ya fue creada
    }
  } catch (err) {
    console.warn("[registerWithRateLimit] Error enviando email:", err);
  }
  
  return result;
}

// Helper para login
export async function loginWithRateLimit(email: string, password: string) {
  const deviceId = getOrCreateDeviceId();
  
  const response = await fetch("/api/auth/validate-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": deviceId, // ← ENVIAR EL DEVICE ID
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Error en login");
  }
  
  return await response.json();
}

/**
 * ✅ INTEGRACIÓN COMPLETA
 * 
 * firebase-auth.ts ya importa y usa estas funciones:
 * - registerUser() → registerWithRateLimit()
 * - loginUser() → loginWithRateLimit()
 * 
 * El Device ID se genera automáticamente y se envía al servidor
 * para el rate limiting por dispositivo.
 */
