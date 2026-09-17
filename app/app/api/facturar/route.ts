import { NextRequest, NextResponse } from "next/server";
import admin from "../../lib/firebase-admin";

export const runtime = "nodejs";

// Simulación de API de facturación SRI
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
    }

    // Obtener la orden desde Firestore
    const db = admin.firestore();
    const ordenSnap = await db.collection("ordenes").doc(orderId).get();
    if (!ordenSnap.exists) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    const orden = ordenSnap.data();

    // Validar estado de pago y aprobación
    if (orden.estado !== "aprobada" || orden.paymentStatus !== "paid") {
      return NextResponse.json({ error: "La orden no está aprobada o pagada" }, { status: 400 });
    }

    // Simular llamada a SRI
    const factura = {
      numero: "FAC-" + Math.floor(Math.random() * 1000000),
      fecha: new Date().toISOString(),
      cliente: orden.guestEmail || orden.userEmail,
      productos: orden.productos,
      total: orden.total,
      estado: "emitida",
    };

    // Guardar la factura en la orden
    await db.collection("ordenes").doc(orderId).update({ factura });

    return NextResponse.json({ success: true, factura });
  } catch (err: any) {
    console.error("[facturar]", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
