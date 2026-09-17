import { db } from "./firebase";
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc, arrayRemove, getDoc } from "firebase/firestore";

const COLLECTION = "atributos";

export type Atributo = {
  id?: string;
  nombre: string;
  valores: string[];
  createdAt?: number;
  fechaCreacion?: any;
};

export async function obtenerAtributos(): Promise<Atributo[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function crearAtributo(nombre: string): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    nombre,
    valores: [],
    createdAt: Date.now(),
    fechaCreacion: serverTimestamp(),
  });
  return docRef.id;
}

export async function agregarValorAtributo(atributoId: string, valor: string): Promise<void> {
  const ref = doc(db, COLLECTION, atributoId);
  await updateDoc(ref, {
    valores: arrayUnion(valor),
  });
}

export async function eliminarValorAtributo(atributoId: string, valor: string): Promise<void> {
  const ref = doc(db, COLLECTION, atributoId);
  await updateDoc(ref, {
    valores: arrayRemove(valor),
  });
}

export async function renombrarValorAtributo(atributoId: string, oldValue: string, newValue: string): Promise<void> {
  const ref = doc(db, COLLECTION, atributoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Atributo no encontrado');
  const data = snap.data() as any;
  const valores: string[] = Array.isArray(data.valores) ? data.valores : [];
  const idx = valores.indexOf(oldValue);
  if (idx === -1) throw new Error('Valor no encontrado');
  valores[idx] = newValue;
  await updateDoc(ref, { valores });
}

export async function actualizarAtributo(id: string, data: Partial<Atributo>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data as any);
}

export async function eliminarAtributo(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
