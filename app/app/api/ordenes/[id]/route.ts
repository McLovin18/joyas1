import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const orderDoc = await db.collection("ordenes").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    return NextResponse.json(orderData);
  } catch (error) {
    console.error("Error obteniendo orden:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
