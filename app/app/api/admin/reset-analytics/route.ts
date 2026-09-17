/**
 * 🔄 ENDPOINT: RESET ANALYTICS
 * 
 * Reseta analytics cada día a las 11 PM
 * GET /api/admin/reset-analytics
 * 
 * IMPORTANTE: Esta función debe ser llamada por un cron job (Vercel Crons, EasyCron, etc)
 */

import { NextRequest, NextResponse } from "next/server";
import { resetTodayAnalytics } from "../../../lib/analytics-db";

export async function GET(req: NextRequest) {
  try {
    // Verificar que sea una llamada legítima (desde un cron job)
    const authHeader = req.headers.get("authorization");
    const cronToken = process.env.CRON_SECRET;

    if (!cronToken || authHeader !== `Bearer ${cronToken}`) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing CRON_SECRET" },
        { status: 401 }
      );
    }

    // Obtener la hora actual
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Solo ejecutar entre las 11:00 PM y 11:05 PM (23:00-23:05)
    if (hours !== 23 || minutes > 5) {
      return NextResponse.json(
        {
          message: "Not scheduled time for reset (should be 11:00 PM - 11:05 PM)",
          currentTime: now.toLocaleString("es-ES"),
        },
        { status: 200 }
      );
    }

    // Resetear analytics
    await resetTodayAnalytics();

    return NextResponse.json(
      {
        success: true,
        message: "Analytics reset successfully",
        time: now.toLocaleString("es-ES"),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Reset Analytics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
