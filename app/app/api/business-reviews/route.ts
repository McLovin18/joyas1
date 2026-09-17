import { NextRequest, NextResponse } from "next/server";
import { getBusinessReviews, addBusinessReview } from "@/app/lib/business-reviews-db";

export async function GET(req: NextRequest) {
  try {
    const reviews = await getBusinessReviews();
    return NextResponse.json(reviews);
  } catch (err) {
    console.error("/api/business-reviews GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.userName || !data.rating || !data.comment) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    // Validar userEmail si está presente
    if (data.userEmail && (typeof data.userEmail !== "string" || 
        data.userEmail.trim() === "" || 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.userEmail.trim()))) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    // Trim email si existe
    if (data.userEmail) {
      data.userEmail = data.userEmail.trim();
    }
    await addBusinessReview(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/business-reviews POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
