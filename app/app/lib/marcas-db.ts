import { db } from "./firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";

const COLLECTION = "marcas";

export async function obtenerMarcas() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function guardarMarca(nombre) {
  await setDoc(doc(db, COLLECTION, nombre.toLowerCase().replace(/\s+/g, "_")), { nombre });
}

export async function eliminarMarca(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
