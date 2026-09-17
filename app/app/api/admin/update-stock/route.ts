import { NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    // 🔒 validar admin
    if (!decoded.admin) {
      return NextResponse.json({ error: "No eres admin" }, { status: 403 });
    }

    const body = await req.json();
    const { id, stock } = body;

    if (!id || typeof stock !== "number") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await admin.firestore().collection("productos").doc(id).update({ stock });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}