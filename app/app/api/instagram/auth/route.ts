import { NextRequest, NextResponse } from "next/server";
import { saveInstagramConfig } from "@/app/lib/instagram-db";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/instagram/auth/callback`;

export async function GET(req: NextRequest) {
  try {
    if (!INSTAGRAM_APP_ID) {
      return NextResponse.json({ error: "Instagram App ID not configured" }, { status: 500 });
    }

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Instagram auth error:", error);
    return NextResponse.json({ error: "Instagram auth failed" }, { status: 500 });
  }
}
