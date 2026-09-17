import { NextResponse } from "next/server";
import admin, { adminAuth } from "../../../lib/firebase-admin";

export async function GET() {
  try {
    const firestore = admin.firestore();

    const snapshot = await firestore.collection("ordenes").get();

    const stats = new Map<string, { totalOrdenes: number; pedidosAprobados: number }>();

    snapshot.forEach((docSnap) => {
      const data: any = docSnap.data();
      const uid = data.userId as string | undefined;
      if (!uid) return;

      const current = stats.get(uid) || { totalOrdenes: 0, pedidosAprobados: 0 };
      current.totalOrdenes += 1;
      if (data.estado === "aprobada") {
        current.pedidosAprobados += 1;
      }
      stats.set(uid, current);
    });

    const entries = Array.from(stats.entries());

    const clientes = await Promise.all(
      entries.map(async ([uid, rec]) => {
        // Intentar obtener datos de perfil adicionales desde Firestore (colección "usuarios")
        let phoneFromProfile: string | null = null;
        try {
          const userDoc = await firestore.collection("usuarios").doc(uid).get();
          if (userDoc.exists) {
            const data: any = userDoc.data();
            phoneFromProfile = (data.phoneNumber || data.telefono || null) as string | null;
          }
        } catch {}

        try {
          const userRecord = await adminAuth.getUser(uid);
          return {
            uid,
            email: userRecord.email || null,
            displayName: userRecord.displayName || null,
            phoneNumber: phoneFromProfile || userRecord.phoneNumber || null,
            totalOrdenes: rec.totalOrdenes,
            pedidosAprobados: rec.pedidosAprobados,
            disabled: userRecord.disabled,
            createdAt: userRecord.metadata?.creationTime || null,
            lastLoginAt: userRecord.metadata?.lastSignInTime || null,
          };
        } catch {
          return {
            uid,
            email: null,
            displayName: null,
            phoneNumber: phoneFromProfile,
            totalOrdenes: rec.totalOrdenes,
            pedidosAprobados: rec.pedidosAprobados,
            disabled: null,
            createdAt: null,
            lastLoginAt: null,
          };
        }
      })
    );

    return NextResponse.json({ clientes });
  } catch (e) {
    console.error("[api/admin/clientes] Error:", e);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}
