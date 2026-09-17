// lib/ordenes-transferencia-db.ts
//
// Maneja las "órdenes por transferencia bancaria": el cliente paga un
// porcentaje inicial (bono) desde la web y sube su comprobante. El resto
// del pedido se termina de coordinar por WhatsApp con el admin.
//
// AJUSTA el import de abajo al archivo real donde exportas `db` y `storage`
// de Firebase en tu proyecto (ej: "./firebase", "./firebase-config", etc.)
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface ProductoResumen {
  nombre: string;
  cantidad: number;
}

export type EstadoOrdenTransferencia = "pendiente" | "confirmado" | "rechazado";

export interface OrdenTransferencia {
  id?: string;
  nombre: string;
  whatsapp: string;
  banco: string;
  montoTotal: number;
  porcentajeInicial: number;
  montoInicial: number;
  montoRestante: number;
  comprobanteURL: string;
  productos: ProductoResumen[];
  estado: EstadoOrdenTransferencia;
  fecha: Timestamp;
}

const COLLECTION_NAME = "ordenesTransferencia";

/**
 * Sube la imagen del comprobante de pago a Firebase Storage y devuelve la URL pública.
 */
export async function subirComprobanteTransferencia(
  file: File,
  nombreCliente: string
): Promise<string> {
  const timestamp = Date.now();
  const safeNombre = nombreCliente
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const path = `comprobantes-transferencia/${timestamp}_${safeNombre || "cliente"}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Crea la orden de transferencia en Firestore, ya con el comprobante subido.
 */
export async function crearOrdenTransferencia(data: {
  nombre: string;
  whatsapp: string;
  banco: string;
  montoTotal: number;
  porcentajeInicial: number;
  comprobanteURL: string;
  productos: ProductoResumen[];
}): Promise<string> {
  const montoInicial = Number(
    ((data.montoTotal * data.porcentajeInicial) / 100).toFixed(2)
  );
  const montoRestante = Number((data.montoTotal - montoInicial).toFixed(2));

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    nombre: data.nombre,
    whatsapp: data.whatsapp,
    banco: data.banco,
    montoTotal: data.montoTotal,
    porcentajeInicial: data.porcentajeInicial,
    montoInicial,
    montoRestante,
    comprobanteURL: data.comprobanteURL,
    productos: data.productos,
    estado: "pendiente" as EstadoOrdenTransferencia,
    fecha: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Trae todas las órdenes de transferencia, más recientes primero.
 */
export async function obtenerOrdenesTransferencia(): Promise<OrdenTransferencia[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() } as OrdenTransferencia)
  );
}

/**
 * El admin marca una orden como confirmada o rechazada tras validar el comprobante.
 */
export async function actualizarEstadoOrdenTransferencia(
  id: string,
  estado: EstadoOrdenTransferencia
): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { estado });
}

/**
 * Elimina una orden de transferencia de Firestore.
 */
export async function eliminarOrdenTransferencia(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}