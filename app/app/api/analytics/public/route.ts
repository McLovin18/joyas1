import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

const ANALYTICS_COLLECTION = "analytics";

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const today = getTodayDate();
    const docRef = db.collection(ANALYTICS_COLLECTION).doc(today);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { visitors: 0, purchases: 0, purchasesWhatsApp: 0, purchasesTransfer: 0 },
        { status: 200 }
      );
    }

    const data = docSnap.data() as any;
    const visitors = Number(data?.visits ?? data?.uniqueVisitors ?? 0);
    const purchasesWhatsApp = Number(data?.clicksByType?.purchase_whatsapp ?? 0);
    const purchasesTransfer = Number(data?.clicksByType?.purchase_transfer ?? 0);
    const purchases = purchasesWhatsApp + purchasesTransfer;

    return NextResponse.json(
      { visitors, purchases, purchasesWhatsApp, purchasesTransfer },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to read analytics", details: message },
      { status: 500 }
    );
  }
}
