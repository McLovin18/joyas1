import { NextRequest, NextResponse } from "next/server";
import admin from "../../../lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    // Verificar el token y obtener uid + email del nuevo usuario
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;

    if (!email) {
      return NextResponse.json({ claimed: 0 });
    }

    const db = admin.firestore();

    // Solo filtrar por guestEmail (evita requerir índice compuesto con userId==null)
    const snapshot = await db
      .collection("ordenes")
      .where("guestEmail", "==", email)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ claimed: 0 });
    }

    // Filtrar en código las que aún no tienen userId (no han sido reclamadas)
    const pending = snapshot.docs.filter(
      (doc) => doc.data().userId === null || doc.data().userId === undefined
    );

    if (pending.length === 0) {
      return NextResponse.json({ claimed: 0 });
    }

    // Actualizar cada orden: vincular al usuario y guardar su email
    const batch = db.batch();
    pending.forEach((doc) => {
      batch.update(doc.ref, {
        userId: uid,
        userEmail: email,
        claimedFromGuest: true,
      });
    });
    await batch.commit();

    return NextResponse.json({ claimed: pending.length });
  } catch (err: any) {
    console.error("[claim-guest-orders] Error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
