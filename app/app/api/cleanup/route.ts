/**
 * 🧹 CLEANUP ENDPOINT
 * 
 * Called by:
 * - Vercel Crons (via vercel.json config)
 * - Cloud Scheduler
 * - External monitoring services
 * 
 * Never called via setInterval (prevents duplicate execution in serverless)
 */

import { NextRequest, NextResponse } from "next/server";
import { runCleanupJob } from "../../lib/stock-cleanup-db";

export const runtime = "nodejs";

/**
 * ✅ GET /api/cleanup
 * Called by external cron scheduler
 * Returns cleanup execution status
 */
export async function GET(req: NextRequest) {
  // ⚠️ SECURITY: Verify cron secret if available
  const cronSecret = req.headers.get("x-vercel-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    console.warn("[cleanup] ⚠️ Unauthorized cleanup request (wrong secret)");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    console.log("[cleanup] 🧹 Starting cleanup job via API...");
    const result = await runCleanupJob();

    console.log("[cleanup] ✅ Cleanup completed:", result);

    return NextResponse.json({
      success: result.success,
      stats: result.stats,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[cleanup] ❌ Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * ⚠️ POST alternative (fewer logs/noisy cron requests)
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
