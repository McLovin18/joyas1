/**
 * 🧹 LIMPIEZA AUTOMÁTICA DE RESERVAS EXPIRADAS
 * 
 * Resuelve edge case:
 * - Usuario crea reserva
 * - Pago falla o abandona carrito
 * - Reserva debe expirar automáticamente
 * - Stock se libera después de N minutos
 * 
 * SIN esto: Stock bloqueado artificialmente → Producto "desaparece"
 * CON esto: Stock se autorrecupera después del timeout
 */

import admin from "./firebase-admin";

const RESERVE_EXPIRY_MINUTES = 10; // Reservas expiran en 10 min
const CLEANUP_BATCH_SIZE = 100; // Procesar en lotes
const CLEANUP_CRON_INTERVAL_MS = 60000; // Ejecutar cada 1 min

interface ExpiredReserve {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    cantidad: number;
  }>;
  status: "pending" | "confirmed" | "released";
  createdAt: Date;
  expiresAt: Date;
}

/**
 * ✅ Buscar reservas expiradas usando SOLO expiresAt
 * ⚠️ IMPORTANTE: Use Firestore Timestamp for reliable comparison
 */
export async function findExpiredReserves(): Promise<ExpiredReserve[]> {
  try {
    const db = admin.firestore();
    // ✅ Use Firestore Timestamp instead of Date for accurate comparison
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("stock_reserves")
      .where("status", "==", "pending")
      .where("expiresAt", "<=", now)
      .limit(CLEANUP_BATCH_SIZE)
      .get();

    const expired: ExpiredReserve[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expired.push({
        id: doc.id,
        userId: data.userId,
        items: data.items || [],
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
      });
    });

    return expired;
  } catch (err: any) {
    console.error("[stock-cleanup] ❌ Error finding expired reserves:", err);
    throw err;
  }
}

/**
 * ✅ Liberar stock de una reserva expirada
 * ⚠️ IMPORTANTE: Usa lock atómico para prevenir doble ejecución en modo serverless
 */
export async function releaseExpiredReserve(
  reserveId: string,
  items: Array<{ productId: string; cantidad: number }>
): Promise<{
  success: boolean;
  releasedItems: number;
  error?: string;
}> {
  const db = admin.firestore();

  try {
    const reserveRef = db.collection("stock_reserves").doc(reserveId);
    
    // ✅ STEP 1: Check current state OUTSIDE transaction (safe read)
    const currentDoc = await reserveRef.get();
    if (!currentDoc.exists) {
      throw new Error(`Reserve ${reserveId} not found`);
    }

    const currentStatus = currentDoc.data()?.status;
    const processingStartedAt = currentDoc.data()?.processingStartedAt;

    // ✅ STEP 2: Decide whether to process BEFORE transaction
    let shouldProcess = currentStatus === "pending";

    if (currentStatus === "processing" && processingStartedAt) {
      // ✅ ULTRA ROBUST: Handle all timestamp formats
      let processingMs = 0;

      if (typeof processingStartedAt === "number") {
        processingMs = processingStartedAt;
      } else if (processingStartedAt?.toMillis && typeof processingStartedAt.toMillis === "function") {
        processingMs = processingStartedAt.toMillis();
      } else if (processingStartedAt?.seconds) {
        processingMs = processingStartedAt.seconds * 1000;
      }

      if (!processingMs) {
        // Invalid timestamp, allow retry
        console.warn(
          `⚠️ [CLEANUP] Reserve ${reserveId} has invalid processingStartedAt, allowing retry`
        );
        shouldProcess = true;
      } else {
        const elapsedMs = Date.now() - processingMs;
        
        if (elapsedMs < 300000) { // < 5 min, still processing
          console.log(
            `ℹ️ [CLEANUP] Reserve ${reserveId} status: ${currentStatus} (skip, processing since ${Math.round(elapsedMs / 1000)}s)`
          );
          shouldProcess = false;
        } else {
          // Fall through: > 5 min stuck, allow retry
          console.warn(
            `⚠️ [CLEANUP] Reserve ${reserveId} stuck in processing for ${Math.round(elapsedMs / 1000)}s, retrying...`
          );
          shouldProcess = true;
        }
      }
    } else if (currentStatus !== "pending") {
      console.log(
        `ℹ️ [CLEANUP] Reserve ${reserveId} already has status: ${currentStatus} (skip)`
      );
      shouldProcess = false;
    }

    // ✅ STEP 3: If we decided NOT to process, exit early (SAFE, no transaction)
    if (!shouldProcess) {
      return {
        success: true,
        releasedItems: 0,
      };
    }

    // ✅ STEP 4: ONLY NOW enter transaction to claim the lock
    await db.runTransaction(async (transaction) => {
      const reserveDoc = await transaction.get(reserveRef);

      // Double-check state hasn't changed (race condition protection)
      const status = reserveDoc.data()?.status;
      if (status !== "pending" && status !== "processing") {
        throw new Error(`RESERVE_ALREADY_PROCESSED:${status}`);
      }

      // 🔒 MARCAR COMO "processing" ATÓMICAMENTE
      transaction.update(reserveRef, {
        status: "processing",
        processingStartedAt: admin.firestore.Timestamp.now(),
      });
    });

    // ✅ AHORA PROCESAR: Como tenemos el lock, somos los únicos
    await db.runTransaction(async (transaction) => {
      const reserveRef = db.collection("stock_reserves").doc(reserveId);

      // 1️⃣ Marcar como "released"
      transaction.update(reserveRef, {
        status: "released",
        releasedAt: admin.firestore.Timestamp.now(),
        reason: "expired",
        processingEndedAt: admin.firestore.Timestamp.now(),
      });

      // 2️⃣ Incrementar stock usando FieldValue.increment() (ATOMIC)
      // ✅ Esto es THREAD-SAFE - no hay race condition
      // ⚠️ IMPORTANTE: historial movido a subcolección para escalabilidad
      for (const item of items) {
        const productRef = db.collection("productos").doc(item.productId);

        transaction.update(productRef, {
          // ✅ FieldValue.increment es atómico en Firestore
          stock: admin.firestore.FieldValue.increment(item.cantidad),
          lastStockUpdateAt: admin.firestore.Timestamp.now(),
        });

        // 📝 Guardar historial en subcolección (MEJOR ESCALABILIDAD)
        const historyRef = productRef
          .collection("stock_history")
          .doc(`${reserveId}_${Date.now()}`);
        transaction.set(historyRef, {
          type: "reserve_release",
          cantidad: item.cantidad,
          reserveId,
          reason: "expired",
          timestamp: admin.firestore.Timestamp.now(),
        });
      }
    });

    console.log(`✅ [CLEANUP] Reserve ${reserveId} released (expired). Items: ${items.length}`);

    return {
      success: true,
      releasedItems: items.length,
    };
  } catch (err: any) {
    console.error(`❌ [stock-cleanup] Error releasing reserve ${reserveId}:`, err);
    return {
      success: false,
      releasedItems: 0,
      error: err.message,
    };
  }
}

/**
 * ✅ Ejecutar limpieza completa (llamar cada N minutos desde cron/scheduler)
 */
export async function cleanupExpiredReserves(): Promise<{
  totalExpired: number;
  totalReleased: number;
  errors: number;
}> {
  try {
    console.log(`🧹 [CLEANUP] Starting expired reserve cleanup...`);

    const expired = await findExpiredReserves();

    if (expired.length === 0) {
      console.log(`✅ [CLEANUP] No expired reserves found`);
      return { totalExpired: 0, totalReleased: 0, errors: 0 };
    }

    let released = 0;
    let errors = 0;

    for (const reserve of expired) {
      const result = await releaseExpiredReserve(reserve.id, reserve.items);
      if (result.success) {
        released++;
      } else {
        errors++;
      }
    }

    console.log(
      `✅ [CLEANUP] Completed. Expired: ${expired.length}, Released: ${released}, Errors: ${errors}`
    );

    return {
      totalExpired: expired.length,
      totalReleased: released,
      errors,
    };
  } catch (err: any) {
    console.error("[stock-cleanup] ❌ Fatal error during cleanup:", err);
    return { totalExpired: 0, totalReleased: 0, errors: 1 };
  }
}

/**
 * ✅ Inicializar cleanup automático (ejecutar al startup)
 * Llamar esto en: app/layout.tsx o en un API route init
 */
/**
 * ⏱️ DISTRIBUTED LOCK para cleanup en serverless
 * En Vercel/CF: múltiples instancias pueden ejecutar setInterval()
 * Usamos Firestore doc lock para coordinar una sola ejecución
 */
async function acquireCleanupLock(): Promise<string | null> {
  const db = admin.firestore();
  const lockDocRef = db.collection("system_locks").doc("cleanup_lock");
  const lockId = `cleanup_${Date.now()}_${Math.random()}`;
  
  try {
    await db.runTransaction(async (tx) => {
      const lockDoc = await tx.get(lockDocRef);
      
      // Si lock existe y NO ha expirado (< 2 min), otro proceso lo tiene
      if (lockDoc.exists) {
        // ✅ ULTRA ROBUST: Handle all possible timestamp formats
        const raw = lockDoc.data().acquiredAt;
        let acquiredMs = 0;

        if (typeof raw === "number") {
          // Case 1: Direct number (milliseconds)
          acquiredMs = raw;
        } else if (raw?.toMillis && typeof raw.toMillis === "function") {
          // Case 2: Firestore Timestamp with toMillis()
          acquiredMs = raw.toMillis();
        } else if (raw?.seconds) {
          // Case 3: Firestore Timestamp object with seconds property
          acquiredMs = raw.seconds * 1000;
        } else {
          // Case 4: Unknown format or missing
          console.warn(
            `[LOCK] ⚠️ Invalid/corrupted acquiredAt format: ${JSON.stringify(raw)}`
          );
          acquiredMs = 0;
        }

        // If lock timestamp is invalid (0) or missing, FAIL FAST (not corrupted, just invalid)
        if (!acquiredMs) {
          console.error(
            `[LOCK] ❌ CRITICAL: Lock has corrupted acquiredAt (${raw}), cannot proceed`
          );
          throw new Error("INVALID_LOCK_STATE");
        }

        const lockAge = Date.now() - acquiredMs;
        if (lockAge < 120000) { // 2 min timeout
          console.log(
            `[LOCK] ℹ️ Held by ${lockDoc.data().instance}, age: ${Math.round(lockAge / 1000)}s`
          );
          throw new Error("LOCK_HELD");
        }
        console.warn(
          `[LOCK] ⚠️ Old lock expired (${Math.round(lockAge / 1000)}s), overriding...`
        );
      }
      
      // ✅ Acquire lock (o override si expiró)
      tx.set(lockDocRef, {
        lockId,
        acquiredAt: Date.now(),
        instance: typeof process !== "undefined" ? process.env.VERCEL_DEPLOYMENT_ID : "local",
        pid: typeof process !== "undefined" ? process.pid : null,
        hostname: typeof process !== "undefined" ? process.env.VERCEL_URL : "local",
        acquiredBy: "cleanup_scheduler",
      });
    });
    
    return lockId;
  } catch (err: any) {
    if (err.message === "LOCK_HELD") {
      return null; // Lock held by another process
    }
    throw err;
  }
}

async function releaseCleanupLock(lockId: string): Promise<void> {
  const db = admin.firestore();
  const lockDocRef = db.collection("system_locks").doc("cleanup_lock");
  
  try {
    await db.runTransaction(async (tx) => {
      const lockDoc = await tx.get(lockDocRef);
      
      // Solo release si nosotros lo tenemos
      if (lockDoc.exists && lockDoc.data().lockId === lockId) {
        tx.delete(lockDocRef);
      }
    });
  } catch (err) {
    console.error("[cleanup] Error releasing lock:", err);
  }
}

/**
 * ⚠️ IMPORTANT: Cleanup is called via /api/cleanup endpoint ONLY
 * Do NOT call setInterval or initializeCleanupScheduler in any code
 * Schedule cleanup jobs via:
 * - Vercel Crons (vercel.json)
 * - Cloud Scheduler (GCP)
 * - Scheduled Tasks (your monitoring service)
 */
export async function runCleanupJob(): Promise<{
  success: boolean;
  stats?: { totalExpired: number; totalReleased: number; errors: number };
  error?: string;
}> {
  try {
    const lockId = await acquireCleanupLock();
    
    if (!lockId) {
      console.log("[cleanup] ⏳ Cleanup already running");
      return { success: false, error: "Cleanup already running" };
    }
    
    try {
      const stats = await cleanupExpiredReserves();
      return { success: true, stats };
    } finally {
      await releaseCleanupLock(lockId);
    }
  } catch (err: any) {
    console.error("[cleanup] Error in cleanup job:", err);
    return { success: false, error: err.message };
  }
}

/**
 * ✅ Health check para monitoreo
 */
export async function getCleanupStats(): Promise<{
  pendingReserves: number;
  confirmedReserves: number;
  releasedReserves: number;
  stockBlockedArtificially: number; // Reservas pendientes hace > 5 min
  blockedProductIds: string[];
}> {
  try {
    const db = admin.firestore();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

    // Contar reservas pendientes
    const pendingSnap = await db
      .collection("stock_reserves")
      .where("status", "==", "pending")
      .count()
      .get();

    const confirmedSnap = await db
      .collection("stock_reserves")
      .where("status", "==", "confirmed")
      .count()
      .get();

    const releasedSnap = await db
      .collection("stock_reserves")
      .where("status", "==", "released")
      .count()
      .get();

    // Buscar reservas antiguas (posiblement bloqueadas)
    const oldReservesSnap = await db
      .collection("stock_reserves")
      .where("status", "==", "pending")
      .where("createdAt", "<=", fiveMinutesAgo)
      .get();

    const blockedProductIds = new Set<string>();
    oldReservesSnap.forEach((doc) => {
      const items = doc.data().items || [];
      items.forEach((item: any) => blockedProductIds.add(item.productId));
    });

    return {
      pendingReserves: pendingSnap.data().count || 0,
      confirmedReserves: confirmedSnap.data().count || 0,
      releasedReserves: releasedSnap.data().count || 0,
      stockBlockedArtificially: oldReservesSnap.size,
      blockedProductIds: Array.from(blockedProductIds),
    };
  } catch (err: any) {
    console.error("[stock-cleanup] Error getting stats:", err);
    return {
      pendingReserves: 0,
      confirmedReserves: 0,
      releasedReserves: 0,
      stockBlockedArtificially: 0,
      blockedProductIds: [],
    };
  }
}

/**
 * ✅ Manual release (para admin que necesite liberar una reserva manualmente)
 */
/**
 * ✅ Manual release with safety guards
 * ⚠️ IMPORTANT: Only release if not already released/confirmed
 */
export async function manualReleaseReserve(
  reserveId: string,
  reason: string = "manual_admin_release"
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = admin.firestore();
    const reserveRef = db.collection("stock_reserves").doc(reserveId);
    const reserveDoc = await reserveRef.get();

    if (!reserveDoc.exists) {
      return { success: false, error: "Reserve not found" };
    }

    const reserve = reserveDoc.data();
    const currentStatus = reserve?.status;

    // ✅ Safety guard: Only process if in a valid state
    if (currentStatus === "released") {
      return { success: false, error: "Reserve already released" };
    }
    if (currentStatus === "confirmed") {
      return { success: false, error: "Reserve confirmed (do not release when confirmed)" };
    }
    if (currentStatus === "expired") {
      return { success: false, error: "Reserve already marked as expired" };
    }

    // ✅ Only allow release if pending or processing
    if (currentStatus !== "pending" && currentStatus !== "processing") {
      return { success: false, error: `Cannot release reserve in status: ${currentStatus}` };
    }

    // ✅ Call releaseExpiredReserve (has its own transaction safety)
    const result = await releaseExpiredReserve(reserveId, reserve.items || []);

    if (result.success) {
      // ✅ Mark with expiredAt to prevent re-processing
      await reserveRef.update({
        reason,
        manuallyReleasedAt: admin.firestore.Timestamp.now(),
        manuallyReleasedBy: "admin",
        expiredAt: admin.firestore.Timestamp.now(),
      });
    }

    return { success: result.success, error: result.error };
  } catch (err: any) {
    console.error("[stock-cleanup] Error in manual release:", err);
    return { success: false, error: err.message };
  }
}
