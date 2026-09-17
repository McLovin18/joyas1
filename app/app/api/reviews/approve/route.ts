import { NextRequest, NextResponse } from "next/server";
import { approveReview } from "@/app/lib/reviews-db";
import { db } from "@/app/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    console.log("[/api/reviews/approve POST] called with id:", id);
    // Verificar existencia antes de intentar actualizar
    const docRef = db.collection("product_reviews").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.warn("[/api/reviews/approve POST] doc not found:", id);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const productId = await approveReview(id);
    console.log("[/api/reviews/approve POST] approved id:", id, "productId:", productId);
    // Revalidate product detail page so approved review appears immediately
    try {
      if (productId) {
        const path = `/product-detail?id=${productId}`;
        console.log("[/api/reviews/approve POST] revalidating path:", path);
        revalidatePath(path);
      }
    } catch (e) {
      console.warn("[/api/reviews/approve POST] revalidatePath failed:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/reviews/approve POST error:", err);
    return NextResponse.json({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
