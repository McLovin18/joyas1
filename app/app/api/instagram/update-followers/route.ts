import { NextRequest, NextResponse } from "next/server";
import { getInstagramConfig, updateFollowersCount } from "@/app/lib/instagram-db";

export async function POST(req: NextRequest) {
  try {
    const config = await getInstagramConfig();

    if (!config.accessToken) {
      return NextResponse.json({ error: "Instagram not authorized" }, { status: 400 });
    }

    // Check if token is expired
    if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Instagram access token expired" }, { status: 401 });
    }

    // Get user ID and followers count using Instagram Graph API
    // This requires a business Instagram account and proper permissions
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,followers_count&access_token=${config.accessToken}`
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Instagram user info error:", errorText);
      
      // If basic API doesn't have followers_count, try getting media count as fallback
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id&access_token=${config.accessToken}`
      );
      
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        const mediaCount = mediaData.data?.length || 0;
        await updateFollowersCount(mediaCount);
        
        return NextResponse.json({ 
          success: true, 
          followersCount: mediaCount,
          message: "Using media count as placeholder. Instagram Basic Display API doesn't provide followers count. To get real followers count, you need: 1) Instagram Business Account, 2) Instagram Graph API permissions, 3) Proper app review."
        });
      }
      
      return NextResponse.json({ error: "Failed to get Instagram data" }, { status: 400 });
    }

    const userData = await userResponse.json();
    const followersCount = userData.followers_count || 0;

    await updateFollowersCount(followersCount);

    return NextResponse.json({ 
      success: true, 
      followersCount,
      username: userData.username
    });
  } catch (error) {
    console.error("Instagram update followers error:", error);
    return NextResponse.json({ error: "Failed to update followers" }, { status: 500 });
  }
}
