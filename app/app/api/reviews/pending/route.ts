import { NextRequest, NextResponse } from "next/server";
import { getPendingReviews, approveReview, rejectReview } from "@/app/lib/reviews-db";

export async function GET() {
  console.log("[/api/reviews/pending GET] ✓ Endpoint called");
  try {
    console.log("[/api/reviews/pending GET] Calling getPendingReviews...");
    const reviews = await getPendingReviews();
    console.log("[/api/reviews/pending GET] ✓ Got reviews, returning", reviews.length);
    return NextResponse.json(reviews);
  } catch (err) {
    console.error("[/api/reviews/pending GET] ❌ Error:", err);
    // Retornar el error real para debugging
    return NextResponse.json({ 
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = req.nextUrl.pathname.includes("approve") ? "approve" : "reject";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    if (action === "approve") await approveReview(id);
    else await rejectReview(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`/api/reviews/pending POST ${action} error:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
