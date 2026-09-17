import { NextRequest, NextResponse } from "next/server";
import { getProductReviews, addProductReview } from "@/app/lib/reviews-db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  try {
    const reviews = await getProductReviews(productId);
    return NextResponse.json(reviews);
  } catch (err) {
    console.error("/api/reviews GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.productId || !data.userName || !data.rating || !data.comment) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    // Validar userEmail si está presente (puede ser vacío para usuarios sin email)
    if (data.userEmail && (typeof data.userEmail !== "string" || 
        data.userEmail.trim() === "" || 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.userEmail.trim()))) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    // Trim email si existe
    if (data.userEmail) {
      data.userEmail = data.userEmail.trim();
    }
    await addProductReview(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/reviews POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}