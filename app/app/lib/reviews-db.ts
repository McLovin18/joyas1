import { db } from "./firebase-admin";
import { ProductReview } from "./reviews-types";
import { v4 as uuidv4 } from "uuid";

const REVIEWS_COLLECTION = "product_reviews";

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  try {
    // Evitar consultas compuestas que requieren índices: obtener por productId
    // y filtrar/ordenar en memoria para muestras aprobadas.
    const snapshot = await db.collection(REVIEWS_COLLECTION)
      .where("productId", "==", productId)
      .get();
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ProductReview))
      .filter(r => (r as any).approved === true)
      .sort((a, b) => {
        // createdAt almacenado como ISO string; ordenar desc
        const ta = (a as any).createdAt || "";
        const tb = (b as any).createdAt || "";
        if (ta === tb) return 0;
        return ta > tb ? -1 : 1;
      });
    return docs;
  } catch (err) {
    console.error("getProductReviews error:", err);
    throw err;
  }
}

export async function addProductReview(review: Omit<ProductReview, "id" | "approved" | "createdAt">): Promise<void> {
  try {
    // Evitar duplicados: mismo userId y productId (pendiente o aprobado)
    if (review.userId) {
      const dupSnap = await db.collection(REVIEWS_COLLECTION)
        .where("productId", "==", review.productId)
        .where("userId", "==", review.userId)
        .get();
      if (!dupSnap.empty) {
        throw new Error("User has already submitted a review for this product");
      }
    }
    await db.collection(REVIEWS_COLLECTION).add({
      ...review,
      approved: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("addProductReview error:", err);
    throw err;
  }
}

export async function getPendingReviews(): Promise<ProductReview[]> {
  try {
    console.log("[getPendingReviews] Starting...");
    
    // Obtener documentos sin where para evitar problemas de índice/campos
    const snapshot = await db.collection(REVIEWS_COLLECTION)
      .limit(1000)
      .get();
    
    console.log("[getPendingReviews] Total docs fetched:", snapshot.docs.length);
    
    // Filtrar en memoria los pendientes
    const pendingDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.approved === false || data.approved === undefined;
    });
    
    console.log("[getPendingReviews] Pending docs after filter:", pendingDocs.length);
    
    const results: ProductReview[] = [];
    for (const doc of pendingDocs) {
      const data = doc.data();
      const review = { id: doc.id, ...(data as any) } as ProductReview & { productName?: string };
      
      // intentar resolver nombre del producto (si existe)
      try {
        if (data.productId) {
          const prodDoc = await db.collection("productos").doc(data.productId).get();
          if (prodDoc.exists) {
            (review as any).productName = prodDoc.data()?.nombre || prodDoc.data()?.name || null;
          }
        }
      } catch (e) {
        console.warn("Could not fetch product name for review", doc.id, e);
      }
      results.push(review as ProductReview);
    }
    
    // Ordenar por createdAt en memoria (descendente)
    results.sort((a, b) => {
      const ta = (a as any).createdAt || "";
      const tb = (b as any).createdAt || "";
      if (ta === tb) return 0;
      return ta > tb ? -1 : 1;
    });
    
    console.log("[getPendingReviews] ✅ Returning", results.length, "reviews");
    return results;
  } catch (err) {
    console.error("[getPendingReviews] ❌ Error:", err);
    throw err;
  }
}

export async function approveReview(id: string): Promise<string | null> {
  try {
    console.log("[approveReview] approving id:", id);
    const docRef = db.collection(REVIEWS_COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      const msg = `Document not found: ${id}`;
      console.warn("[approveReview]", msg);
      throw new Error(msg);
    }
    const data = snap.data() || {};
    const productId = (data as any).productId || null;
    await docRef.update({ approved: true });
    console.log("[approveReview] done approving id:", id, "productId:", productId);
    return productId;
  } catch (err) {
    console.error("[approveReview] error approving id:", id, err);
    throw err;
  }
}

export async function rejectReview(id: string): Promise<void> {
  try {
    console.log("[rejectReview] deleting id:", id);
    await db.collection(REVIEWS_COLLECTION).doc(id).delete();
    console.log("[rejectReview] deleted id:", id);
  } catch (err) {
    console.error("[rejectReview] error deleting id:", id, err);
    throw err;
  }
}
