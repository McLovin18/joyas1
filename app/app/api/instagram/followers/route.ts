import { NextRequest, NextResponse } from "next/server";
import { getInstagramConfig } from "@/app/lib/instagram-db";

export async function GET(req: NextRequest) {
  try {
    const config = await getInstagramConfig();
    
    return NextResponse.json({ 
      followersCount: config.followersCount || 0,
      lastUpdated: config.lastUpdated || null
    });
  } catch (error) {
    console.error("Instagram get followers error:", error);
    return NextResponse.json({ error: "Failed to get followers" }, { status: 500 });
  }
}
