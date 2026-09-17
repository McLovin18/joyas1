/**
 * 📊 ENDPOINT: TRACK ANALYTICS
 * 
 * POST /api/analytics/track
 * 
 * Recibe eventos de analytics del cliente y los guarda en Firestore
 * con permisos de admin (sin depender de la autenticación del cliente)
 */

import { NextRequest, NextResponse } from "next/server";
import admin, { db } from "../../../lib/firebase-admin";

const ANALYTICS_COLLECTION = "analytics";

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  console.log("[Analytics API] ===== NEW REQUEST =====");
  try {
    console.log("[Analytics API] 1. Parsing request body...");
    const body = await req.json();
    console.log("[Analytics API] 2. Body received:", body);
    
    const { eventType, deviceId, sessionId, clickType: bodyClickType } = body;
    console.log("[Analytics API] 3. Extracted values:", { eventType, deviceId, sessionId, bodyClickType });

    if (!eventType) {
      console.error("[Analytics API] ❌ Missing required fields:", { eventType });
      return NextResponse.json(
        { error: "Missing eventType" },
        { status: 400 }
      );
    }

    const today = getTodayDate();
    console.log("[Analytics API] 4. Today date:", today);
    
    console.log("[Analytics API] 5. Creating Firestore doc reference...");
    const docRef = db.collection(ANALYTICS_COLLECTION).doc(today);
    console.log("[Analytics API] 6. Doc ref created:", { collection: ANALYTICS_COLLECTION, doc: today });

    console.log(`[Analytics API] 7. Processing ${eventType}`);

    if (eventType === "sessionStart" || eventType === "pageView") {
      console.log("[Analytics API] 8a. Branch: sessionStart/pageView");
      const effectiveSessionId = sessionId || deviceId;
      if (!effectiveSessionId) {
        return NextResponse.json(
          { error: "Missing sessionId" },
          { status: 400 }
        );
      }

      const docSnap = await docRef.get();
      console.log("[Analytics API] 8b. Document exists:", docSnap.exists);

      if (docSnap.exists) {
        const data = docSnap.data() as any;
        console.log("[Analytics API] 8c. Existing doc data:", data);
        
        if (!data.sessionIds || !data.sessionIds.includes(effectiveSessionId)) {
          console.log("[Analytics API] 8d. New session, incrementing count...");
          const updatedSessions = [...(data.sessionIds || []), effectiveSessionId];
          await docRef.update({
            sessionIds: updatedSessions,
            visits: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Analytics API] ✅ Updated session start - new session`);
        } else {
          console.log(`[Analytics API] Session already counted, no update`);
        }
      } else {
        console.log("[Analytics API] 8e. Creating new analytics doc...");
        await docRef.set({
          date: today,
          visits: 1,
          sessionIds: [effectiveSessionId],
          totalClicks: 0,
          clicksByType: {
            productClick: 0,
            categoryClick: 0,
            buttonClick: 0,
            linkClick: 0,
            blogClick: 0,
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Analytics API] ✅ Created new analytics doc for today`);
      }
    } else if (eventType === "click") {
      console.log("[Analytics API] 8a. Branch: click");
      // Track click
      const clickType = bodyClickType || "buttonClick";
      console.log(`[Analytics API] 8b. Click type: ${clickType}`);
      if (!deviceId) {
        return NextResponse.json(
          { error: "Missing deviceId" },
          { status: 400 }
        );
      }

      const docSnap = await docRef.get();
      console.log("[Analytics API] 8c. Document exists:", docSnap.exists);

      if (docSnap.exists) {
        console.log("[Analytics API] 8d. Updating existing doc with click...");
        const updateData: any = {
          totalClicks: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        };
        updateData[`clicksByType.${clickType}`] = admin.firestore.FieldValue.increment(1);
        console.log("[Analytics API] 8e. Update data:", updateData);

        await docRef.update(updateData);
        console.log(`[Analytics API] ✅ Updated existing doc with click`);
      } else {
        console.log("[Analytics API] 8d. Creating new doc for click...");
        const newClicksByType = {
          productClick: 0,
          categoryClick: 0,
          buttonClick: 0,
          linkClick: 0,
          blogClick: 0,
        };
        (newClicksByType as any)[clickType] = 1;

        await docRef.set({
          date: today,
          visits: 0,
          sessionIds: [],
          totalClicks: 1,
          clicksByType: newClicksByType,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Analytics API] ✅ Created new doc for click (no visitors yet)`);
      }
    } else {
      console.warn(`[Analytics API] Unknown eventType: ${eventType}`);
      return NextResponse.json(
        { error: "Unknown eventType" },
        { status: 400 }
      );
    }

    console.log(`[Analytics API] ✅✅✅ SUCCESS: tracked ${eventType}`);
    console.log("[Analytics API] ===== REQUEST COMPLETE =====");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log("[Analytics API] ===== ERROR CAUGHT =====");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("[Analytics API] ❌ Error message:", errorMessage);
    console.error("[Analytics API] ❌ Error stack:", errorStack);
    console.error("[Analytics API] ❌ Full error:", error);
    
    return NextResponse.json(
      { error: "Failed to track event", details: errorMessage },
      { status: 500 }
    );
  }
}
