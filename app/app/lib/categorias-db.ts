import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

const COLLECTION = "categorias";

/** Garantiza que el id del documento Firestore no sea sobrescrito por data().id */
export function mapCategoryDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Record<string, any> {
  return { ...docSnap.data(), id: docSnap.id };
}

export function mapCategorySnapshot(
  docs: QueryDocumentSnapshot<DocumentData>[]
): Record<string, any>[] {
  return docs.map(mapCategoryDoc);
}

export function sortCategoriasByOrder(categorias: any[]): any[] {
  return categorias
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
    .map((cat) => ({
      ...cat,
      subcategorias: cat.subcategorias
        ? sortCategoriasByOrder(cat.subcategorias)
        : undefined,
    }));
}

/** Comparación tolerante para filtros (ID vs nombre legacy) */
export function sameCategoryId(a?: string, b?: string): boolean {
  if (!b) return true;
  if (!a) return false;
  return (
    String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
  );
}

function findCategoryById(categorias: any[], id: string): any | undefined {
  return categorias.find((c) => sameCategoryId(c.id, id));
}

function findSubcategory(
  categorias: any[],
  categoriaId: string,
  subId: string
): any | undefined {
  const cat = findCategoryById(categorias, categoriaId);
  return cat?.subcategorias?.find((s: any) => sameCategoryId(s.id, subId));
}

function findSubsubcategory(
  categorias: any[],
  categoriaId: string,
  subId: string,
  subsubId: string
): any | undefined {
  const sub = findSubcategory(categorias, categoriaId, subId);
  return sub?.subcategorias?.find((ss: any) => sameCategoryId(ss.id, subsubId));
}

/** Valores aceptables para producto.categoria (ID o nombre legacy) */
export function getCategoryMatchValues(
  categoriaId: string,
  categorias: any[]
): Set<string> {
  const values = new Set<string>();
  const add = (v?: string) => {
    if (v) values.add(String(v).trim().toLowerCase());
  };
  add(categoriaId);
  const cat = findCategoryById(categorias, categoriaId);
  if (cat) {
    add(cat.id);
    add(cat.nombre);
  }
  return values;
}

export function productMatchesCategoria(
  producto: { categoria?: string },
  categoriaId: string,
  categorias: any[]
): boolean {
  if (!categoriaId) return true;
  const allowed = getCategoryMatchValues(categoriaId, categorias);
  const pc = String(producto.categoria || "").trim().toLowerCase();
  return allowed.has(pc);
}

export function productMatchesSubcategoria(
  producto: { subcategoria?: string },
  categoriaId: string,
  subcategoriaId: string,
  categorias: any[]
): boolean {
  if (!subcategoriaId) return true;
  const allowed = new Set<string>();
  const add = (v?: string) => {
    if (v) allowed.add(String(v).trim().toLowerCase());
  };
  add(subcategoriaId);
  const sub = findSubcategory(categorias, categoriaId, subcategoriaId);
  if (sub) {
    add(sub.id);
    add(sub.nombre);
  }
  const ps = String(producto.subcategoria || "").trim().toLowerCase();
  return allowed.has(ps);
}

export function productMatchesSubsubcategoria(
  producto: { subsubcategoria?: string },
  categoriaId: string,
  subcategoriaId: string,
  subsubcategoriaId: string,
  categorias: any[]
): boolean {
  if (!subsubcategoriaId) return true;
  const allowed = new Set<string>();
  const add = (v?: string) => {
    if (v) allowed.add(String(v).trim().toLowerCase());
  };
  add(subsubcategoriaId);
  const subsub = findSubsubcategory(
    categorias,
    categoriaId,
    subcategoriaId,
    subsubcategoriaId
  );
  if (subsub) {
    add(subsub.id);
    add(subsub.nombre);
  }
  const pss = String(producto.subsubcategoria || "").trim().toLowerCase();
  return allowed.has(pss);
}

export async function obtenerCategorias() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return sortCategoriasByOrder(mapCategorySnapshot(snapshot.docs));
}



function cleanUndefinedDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedDeep);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefinedDeep(v)])
    );
  }
  return obj;
}

export async function guardarCategoria(categoria) {
  await setDoc(doc(db, COLLECTION, categoria.id), cleanUndefinedDeep(categoria));
}

export async function actualizarCategoria(id, data) {
  await updateDoc(doc(db, COLLECTION, id), cleanUndefinedDeep(data));
}

export async function eliminarCategoria(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
