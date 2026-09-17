"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import ProductoCard from "./ProductoCard";
import { db } from "../lib/firebase";
import {
  mapCategorySnapshot,
  productMatchesCategoria,
  sortCategoriasByOrder,
} from "../lib/categorias-db";

type Props = {
  products: any[];
};

// Categoría de "Trabajos entregados" — solo debe mostrarse en la grilla
// de productos cuando el usuario la selecciona explícitamente, nunca en "Todos".
const TRABAJOS_ENTREGADOS_CAT_ID = "1785564342207";

export default function HomeCategoriesProductsSection({ products }: Props) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snap.docs)));
    });
    return () => unsub();
    
  }, []);

  const topCategories = useMemo(() => {
    return (categorias || []).filter((c) => c?.id && c?.nombre);
  }, [categorias]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];

    if (selectedCatId) {
      return list.filter((p) => productMatchesCategoria(p, selectedCatId, categorias));
    }

    // "Todos": excluir siempre los productos de "Trabajos entregados"
    return list.filter(
      (p) => !productMatchesCategoria(p, TRABAJOS_ENTREGADOS_CAT_ID, categorias)
    );
  }, [products, selectedCatId, categorias]);

  const shownProducts = useMemo(() => {
    return filteredProducts.slice(0, 12);
  }, [filteredProducts]);

  if (!topCategories.length) return null;

  return (
    <section className="px-4 lg:px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center text-xl sm:text-2xl font-extrabold tracking-wide text-white">
          Categorías
        </h2>

        <div
          className="mt-6 w-full max-w-full flex items-center justify-start sm:justify-center gap-4 overflow-x-auto overflow-y-hidden pb-2 pl-4 pr-4 -mx-4 sm:mx-0 sm:pl-0 sm:pr-2 no-scrollbar"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            type="button"
            onClick={() => setSelectedCatId("")}
            className="flex flex-col items-center min-w-[84px] shrink-0 select-none"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 shadow-sm flex items-center justify-center ${
                !selectedCatId
                  ? "border-red-600 ring-2 ring-white/20"
                  : "border-white/20"
              } bg-black`}
            >
              <span className="flex flex-col text-white text-sm items-center w-24 shrink-0 select-none">
                TODOS
              </span>
            </div>
            <span
              className={`mt-2 text-sm ${
                !selectedCatId ? "text-white" : "text-white/70"
              } text-center`}
            >
              Todos
            </span>
          </button>

          {topCategories.map((cat) => {
            const selected = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className="flex flex-col items-center w-24 shrink-0 select-none"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 shadow-sm overflow-hidden ${
                    selected
                      ? "border-red-600 ring-2 ring-white/20"
                      : "border-white/20"
                  } bg-black`}
                >
                  {cat.imagen ? (
                    <img
                      src={cat.imagen}
                      alt={cat.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">

                    </div>
                  )}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    selected ? "text-white" : "text-white/70"
                  } text-center leading-tight`}
                >
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {shownProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/60">
              No hay productos para esta categoría.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-in fade-in duration-700">
              {shownProducts.map((p: any, index: number) => (
                <ProductoCard key={p.id} producto={p} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}