import { db } from "./firebase-admin";
import { BusinessReview } from "./business-reviews-types";

const BUSINESS_REVIEWS_COLLECTION = "business_reviews";

export async function getBusinessReviews(): Promise<BusinessReview[]> {
  try {
    const snapshot = await db.collection(BUSINESS_REVIEWS_COLLECTION)
      .limit(1000)
      .get();
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as BusinessReview))
      .filter(r => r.approved === true)
      .sort((a, b) => {
        const ta = a.createdAt || "";
        const tb = b.createdAt || "";
        if (ta === tb) return 0;
        return ta > tb ? -1 : 1;
      });
    return docs;
  } catch (err) {
    console.error("getBusinessReviews error:", err);
    throw err;
  }
}

export async function addBusinessReview(review: Omit<BusinessReview, "id" | "approved" | "createdAt">): Promise<void> {
  try {
    // Evitar duplicados: mismo userId (pendiente o aprobado)
    if (review.userId) {
      const dupSnap = await db.collection(BUSINESS_REVIEWS_COLLECTION)
        .where("userId", "==", review.userId)
        .get();
      if (!dupSnap.empty) {
        throw new Error("User has already submitted a business review");
      }
    }
    await db.collection(BUSINESS_REVIEWS_COLLECTION).add({
      ...review,
      approved: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("addBusinessReview error:", err);
    throw err;
  }
}

export async function getPendingBusinessReviews(): Promise<BusinessReview[]> {
  try {
    console.log("[getPendingBusinessReviews] Starting...");
    
    const snapshot = await db.collection(BUSINESS_REVIEWS_COLLECTION)
      .limit(1000)
      .get();
    
    console.log("[getPendingBusinessReviews] Total docs fetched:", snapshot.docs.length);
    
    const pendingDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.approved === false || data.approved === undefined;
    });
    
    console.log("[getPendingBusinessReviews] Pending docs after filter:", pendingDocs.length);
    
    const results: BusinessReview[] = pendingDocs.map(doc => 
      ({ id: doc.id, ...doc.data() } as BusinessReview)
    );
    
    results.sort((a, b) => {
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      if (ta === tb) return 0;
      return ta > tb ? -1 : 1;
    });
    
    console.log("[getPendingBusinessReviews] ✅ Returning", results.length, "reviews");
    return results;
  } catch (err) {
    console.error("[getPendingBusinessReviews] ❌ Error:", err);
    throw err;
  }
}

export async function approveBusinessReview(id: string): Promise<void> {
  try {
    console.log("[approveBusinessReview] approving id:", id);
    const docRef = db.collection(BUSINESS_REVIEWS_COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      const msg = `Document not found: ${id}`;
      console.warn("[approveBusinessReview]", msg);
      throw new Error(msg);
    }
    await docRef.update({ approved: true });
    console.log("[approveBusinessReview] done approving id:", id);
  } catch (err) {
    console.error("[approveBusinessReview] error approving id:", id, err);
    throw err;
  }
}

export async function rejectBusinessReview(id: string): Promise<void> {
  try {
    console.log("[rejectBusinessReview] deleting id:", id);
    await db.collection(BUSINESS_REVIEWS_COLLECTION).doc(id).delete();
    console.log("[rejectBusinessReview] deleted id:", id);
  } catch (err) {
    console.error("[rejectBusinessReview] error deleting id:", id, err);
    throw err;
  }
}
