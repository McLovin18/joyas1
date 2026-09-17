import { NextRequest, NextResponse } from "next/server";
import { saveInstagramConfig } from "@/app/lib/instagram-db";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/instagram/auth/callback`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL("/admin/config?instagram_error=access_denied", req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/admin/config?instagram_error=no_code", req.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID || "",
        client_secret: INSTAGRAM_APP_SECRET || "",
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Instagram token exchange error:", errorText);
      return NextResponse.redirect(new URL("/admin/config?instagram_error=token_exchange_failed", req.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;

    // Get long-lived token (expires in 60 days)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${accessToken}`
    );

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      const longLivedToken = longLivedData.access_token;
      const expiresIn = longLivedData.expires_in;

      // Calculate expiration date
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      await saveInstagramConfig({
        accessToken: longLivedToken,
        userId,
        expiresAt,
      });

      return NextResponse.redirect(new URL("/admin/config?instagram_success=authorized", req.url));
    } else {
      // Fallback to short-lived token if long-lived fails
      await saveInstagramConfig({
        accessToken,
        userId,
      });

      return NextResponse.redirect(new URL("/admin/config?instagram_success=authorized_short", req.url));
    }
  } catch (error) {
    console.error("Instagram callback error:", error);
    return NextResponse.redirect(new URL("/admin/config?instagram_error=server_error", req.url));
  }
}
