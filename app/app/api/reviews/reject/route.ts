import { NextRequest, NextResponse } from "next/server";
import { rejectReview } from "@/app/lib/reviews-db";
import { db } from "@/app/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    console.log("[/api/reviews/reject POST] called with id:", id);
    // get productId before deleting to revalidate product page
    const docRef = db.collection("product_reviews").doc(id);
    const snap = await docRef.get();
    const productId = snap.exists ? (snap.data() as any).productId : null;
    await rejectReview(id);
    console.log("[/api/reviews/reject POST] deleted id:", id, "productId:", productId);
    try {
      if (productId) {
        const path = `/product-detail?id=${productId}`;
        console.log("[/api/reviews/reject POST] revalidating path:", path);
        revalidatePath(path);
      }
    } catch (e) {
      console.warn("[/api/reviews/reject POST] revalidatePath failed:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/reviews/reject POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
