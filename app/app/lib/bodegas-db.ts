import { db } from "./firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

const COLLECTION = "bodegas";

export interface Bodega {
  id: string;
  nombre: string;
  tiempoEntrega: number; // en días laborales (7, 10, 15, 20)
  esNuevaColeccion?: boolean;
  createdAt?: Date;
}

export async function obtenerBodegas(): Promise<Bodega[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("nombre", "asc"))
  );
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Bodega));
}

export async function crearBodega(nombre: string, tiempoEntrega: number = 10): Promise<void> {
  const id = nombre.toLowerCase().replace(/\s+/g, "_");
  await setDoc(doc(db, COLLECTION, id), {
    nombre,
    tiempoEntrega,
    createdAt: new Date()
  });
}

export async function actualizarBodega(id: string, nombre: string, tiempoEntrega: number): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), {
    nombre,
    tiempoEntrega
  }, { merge: true });
}

export async function eliminarBodega(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Función para crear la bodega default
export async function crearBodegaDefault(): Promise<void> {
  try {
    const bodegas = await obtenerBodegas();
    const existeDefault = bodegas.some(b => b.id === "technothings");
    
    if (!existeDefault) {
      await crearBodega("Technothings", 10);
    }
  } catch (error) {
    console.error("Error al crear bodega default:", error);
  }
}

// Función para establecer cuál bodega es la Nueva Colección
export async function setNuevaColeccion(bodegaId: string): Promise<void> {
  // Primero, remover la marca de Nueva Colección de todas las bodegas
  const snapshot = await getDocs(collection(db, COLLECTION));
  for (const docSnapshot of snapshot.docs) {
    await setDoc(doc(db, COLLECTION, docSnapshot.id), {
      esNuevaColeccion: false
    }, { merge: true });
  }
  
  // Luego, marcar la bodega seleccionada como Nueva Colección
  await setDoc(doc(db, COLLECTION, bodegaId), {
    esNuevaColeccion: true
  }, { merge: true });
}

// Migración única: convierte bodegas guardadas con el sistema viejo (horas: 12/72)
// al nuevo sistema en días (1/10). Solo toca documentos cuyo valor coincide
// exactamente con 12 o 72, para no afectar bodegas ya migradas o con valores
// personalizados. Llamar una sola vez (por ejemplo desde un botón de admin
// o un script), no en cada carga de la app.
export async function migrarTiempoEntregaAHorasADias(): Promise<{ actualizadas: number }> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  let actualizadas = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const valorActual = data.tiempoEntrega;

    let nuevoValor: number | null = null;
    if (valorActual === 12) nuevoValor = 1;
    else if (valorActual === 72) nuevoValor = 10;

    if (nuevoValor !== null) {
      await setDoc(doc(db, COLLECTION, docSnapshot.id), {
        tiempoEntrega: nuevoValor
      }, { merge: true });
      actualizadas++;
    }
  }

  return { actualizadas };
}

// Listener para cambios en tiempo real
export function escucharBodegas(callback: (bodegas: Bodega[]) => void) {
  const unsub = onSnapshot(
    query(collection(db, COLLECTION), orderBy("nombre", "asc")),
    (snapshot) => {
      const bodegas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Bodega));
      callback(bodegas);
    }
  );
  return unsub;
}