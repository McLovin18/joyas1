/**
 * 📊 STOCK LEDGER - Previene doble descuento y race conditions
 * 
 * Idea: En lugar de actualizar stock directamente, registra MOVIMIENTOS
 * Luego calcula stock = inicial - suma(movimientos)
 * 
 * Beneficios:
 * ✅ Auditoría completa
 * ✅ Previene doble descuento (idempotent)
 * ✅ Detecta inconsistencias
 * ✅ Replay-safe (webhook tardío = detecta duplicado)
 */

import admin from "./firebase-admin";

export interface StockMovement {
  id: string;
  productId: string;
  orderId?: string;
  type:
    | "order_confirmed"
    | "reserve_released"
    | "refund"
    | "adjustment"
    | "webhook_recovery"
    | "payment_failed_release";
  cantidad: number; // Positivo = entrada, Negativo = salida
  source: "webhook" | "checkout" | "cleanup" | "admin" | "recovery";
  idempotencyKey?: string; // Para evitar duplicados
  metadata?: Record<string, any>;
  createdAt: Date;
  transactionId?: string; // Para agrupar movimientos relacionados
}

/**
 * ✅ Registrar movimiento de stock (IDEMPOTENT)
 * Si el idempotencyKey ya existe, retorna el existente sin duplicar
 */
export async function recordStockMovement(
  productId: string,
  cantidad: number,
  type: StockMovement["type"],
  source: StockMovement["source"],
  idempotencyKey?: string,
  metadata?: Record<string, any>
): Promise<{
  success: boolean;
  movementId: string;
  isDuplicate: boolean;
  error?: string;
}> {
  const db = admin.firestore();

  try {
    // Si hay idempotencyKey, verificar que no existe
    if (idempotencyKey) {
      const existingSnap = await db
        .collection("stock_ledger")
        .where("productId", "==", productId)
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        console.log(
          `♻️ [STOCK-LEDGER] Duplicate movement detected, returning cached: ${existing.id}`
        );
        return {
          success: true,
          movementId: existing.id,
          isDuplicate: true,
        };
      }
    }

    // Crear nuevo movimiento
    const movement: Omit<StockMovement, "id"> = {
      productId,
      tipo: type,
      cantidad,
      source,
      idempotencyKey,
      metadata,
      createdAt: new Date(),
    };

    const docRef = await db.collection("stock_ledger").add({
      ...movement,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ [STOCK-LEDGER] Recorded: type=${type}, product=${productId}, qty=${cantidad}`);

    return {
      success: true,
      movementId: docRef.id,
      isDuplicate: false,
    };
  } catch (err: any) {
    console.error("[stock-ledger] Error recording movement:", err);
    return {
      success: false,
      movementId: "",
      isDuplicate: false,
      error: err.message,
    };
  }
}

/**
 * ✅ Calcular stock actual desde ledger
 * Stock real = stock_inicial - (movimientos negativos) + (movimientos positivos)
 */
export async function getCalculatedStock(productId: string): Promise<{
  stock: number;
  movements: number;
  error?: string;
}> {
  try {
    const db = admin.firestore();

    // 1️⃣ Obtener stock inicial del producto
    const productDoc = await db.collection("productos").doc(productId).get();
    if (!productDoc.exists) {
      return { stock: 0, movements: 0, error: "Product not found" };
    }

    const initialStock = Number(productDoc.data()?.stock || 0);

    // 2️⃣ Sumar todos los movimientos
    const movementsSnap = await db
      .collection("stock_ledger")
      .where("productId", "==", productId)
      .get();

    let totalMovements = 0;
    movementsSnap.forEach((doc) => {
      totalMovements += Number(doc.data().cantidad || 0);
    });

    const calculatedStock = initialStock + totalMovements;

    return {
      stock: Math.max(0, calculatedStock), // No permitir negativo
      movements: totalMovements,
    };
  } catch (err: any) {
    console.error("[stock-ledger] Error calculating stock:", err);
    return { stock: 0, movements: 0, error: err.message };
  }
}

/**
 * ✅ Validar que stock es suficiente (usando ledger)
 */
export async function validateStockFromLedger(
  productId: string,
  requiredQty: number
): Promise<{
  valid: boolean;
  currentStock: number;
  error?: string;
}> {
  try {
    const result = await getCalculatedStock(productId);

    if (result.error) {
      return {
        valid: false,
        currentStock: 0,
        error: result.error,
      };
    }

    const isValid = result.stock >= requiredQty;

    return {
      valid: isValid,
      currentStock: result.stock,
      error: isValid
        ? undefined
        : `Insufficient stock. Available: ${result.stock}, Required: ${requiredQty}`,
    };
  } catch (err: any) {
    console.error("[stock-ledger] Error validating stock:", err);
    return {
      valid: false,
      currentStock: 0,
      error: err.message,
    };
  }
}

/**
 * ✅ Detectar anomalías (overselling, etc)
 */
export async function detectStockAnomalies(): Promise<{
  anomalies: Array<{
    productId: string;
    initialStock: number;
    totalMovements: number;
    calculatedStock: number;
    status: "ok" | "negative" | "warning";
  }>;
  failedProducts: number;
}> {
  try {
    const db = admin.firestore();

    // Obtener todos los productos
    const productsSnap = await db.collection("productos").limit(1000).get();

    const anomalies: Array<{
      productId: string;
      initialStock: number;
      totalMovements: number;
      calculatedStock: number;
      status: "ok" | "negative" | "warning";
    }> = [];

    let failedProducts = 0;

    for (const productDoc of productsSnap.docs) {
      try {
        const productId = productDoc.id;
        const initialStock = Number(productDoc.data().stock || 0);

        const result = await getCalculatedStock(productId);

        if (result.error) {
          failedProducts++;
          continue;
        }

        const calculatedStock = result.stock;
        const totalMovements = result.movements;

        let status: "ok" | "negative" | "warning" = "ok";

        if (calculatedStock < 0) {
          status = "negative";
        } else if (Math.abs(calculatedStock - initialStock) > 100) {
          status = "warning";
        }

        if (status !== "ok") {
          anomalies.push({
            productId,
            initialStock,
            totalMovements,
            calculatedStock,
            status,
          });
        }
      } catch (err) {
        failedProducts++;
      }
    }

    return { anomalies, failedProducts };
  } catch (err: any) {
    console.error("[stock-ledger] Error detecting anomalies:", err);
    return { anomalies: [], failedProducts: -1 };
  }
}

/**
 * ✅ Report de movimientos por orden
 */
export async function getMovementsByOrder(orderId: string): Promise<StockMovement[]> {
  try {
    const db = admin.firestore();

    const snap = await db
      .collection("stock_ledger")
      .where("metadata.orderId", "==", orderId)
      .orderBy("createdAt", "desc")
      .get();

    const movements: StockMovement[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      movements.push({
        id: doc.id,
        ...(data as Omit<StockMovement, "id">),
      });
    });

    return movements;
  } catch (err: any) {
    console.error("[stock-ledger] Error getting movements:", err);
    return [];
  }
}

/**
 * ✅ Cleanup de ledger (mantener última semana)
 */
export async function archiveOldLedgerEntries(daysToKeep: number = 7): Promise<{
  archived: number;
  error?: string;
}> {
  try {
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const snap = await db
      .collection("stock_ledger")
      .where("createdAt", "<", cutoffDate)
      .limit(500)
      .get();

    if (snap.empty) {
      return { archived: 0 };
    }

    const batch = db.batch();
    let count = 0;

    snap.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    console.log(`✅ [STOCK-LEDGER] Archived ${count} old entries`);

    return { archived: count };
  } catch (err: any) {
    console.error("[stock-ledger] Error archiving entries:", err);
    return { archived: 0, error: err.message };
  }
}
