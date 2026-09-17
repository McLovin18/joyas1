/**
 * API ENDPOINT: Reset Daily Analytics
 * POST /api/admin/reset-analytics
 * 
 * Called automatically by a cron job at ~11 PM
 * Resets page views and clicks counter for the new day
 */

import { NextRequest, NextResponse } from "next/server";
import { resetTodayAnalytics } from "../../../lib/analytics-db";

// Admin token for security
function verifyAdminToken(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  const expected = process.env.ADMIN_MAINTENANCE_TOKEN;

  if (!expected || token !== expected) {
    console.warn("[Reset Analytics] Unauthorized access attempt");
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    if (!verifyAdminToken(req)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid admin token" },
        { status: 401 }
      );
    }

    // Reset analytics for the new day
    await resetTodayAnalytics();

    return NextResponse.json(
      {
        success: true,
        message: "Daily analytics reset successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Reset Analytics] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
