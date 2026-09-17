import { NextRequest, NextResponse } from "next/server";
import { rejectBusinessReview } from "@/app/lib/business-reviews-db";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await rejectBusinessReview(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/business-reviews/reject error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
