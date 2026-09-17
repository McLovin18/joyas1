import { NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId es requerido" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    // Buscar orden por el documento ID (que es igual al orderId legible)
    const ordenRef = db.collection("ordenes").doc(orderId);
    const ordenSnap = await ordenRef.get();

    if (!ordenSnap.exists) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const orden = ordenSnap.data();
    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error al obtener orden:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}
