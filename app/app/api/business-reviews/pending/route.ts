import { NextRequest, NextResponse } from "next/server";
import { getPendingBusinessReviews } from "@/app/lib/business-reviews-db";

export async function GET(req: NextRequest) {
  try {
    const reviews = await getPendingBusinessReviews();
    return NextResponse.json(reviews);
  } catch (err) {
    console.error("/api/business-reviews/pending error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
