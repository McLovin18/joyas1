import { NextRequest, NextResponse } from "next/server";
import admin, { adminAuth } from "../../../lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const docRef = await admin.firestore().collection("usuarios").doc(uid).get();
    const data = docRef.exists ? (docRef.data() as any) : {};
    const phoneNumber = (data.phoneNumber || data.telefono || null) as string | null;

    return NextResponse.json({ phoneNumber });
  } catch (e) {
    console.error("[api/profile/phone] GET error", e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber requerido" }, { status: 400 });
    }

    await admin.firestore().collection("usuarios").doc(uid).set({ phoneNumber }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/profile/phone] POST error", e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
