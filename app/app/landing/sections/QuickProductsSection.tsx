"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
} from "../../lib/categorias-db";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProductoCard from "../../components/ProductoCard";
import type { LandingFieldStyle, LandingSectionStyles } from "../../lib/landing-types";

export type QuickProductsSectionProps = {
  defaultCategoryId?: string;
  defaultCategoryName?: string;
  title?: string;
  subtitle?: string;
  styles?: LandingSectionStyles;
  fieldStyles?: Record<string, LandingFieldStyle>;
};

export default function QuickProductsSection({
  defaultCategoryId = "",
  defaultCategoryName = "",
  title = "Últimas actualizaciones",
  subtitle = "Descubre nuestros productos destacados",
}: QuickProductsSectionProps) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const categoriasRef = collection(db, "categorias");
    const q = query(categoriasRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = sortCategoriasByOrder(mapCategorySnapshot(snapshot.docs));
      setCategorias(cats);
      setSelectedCategoryId((prev) => {
        if (prev && cats.some((c) => c.id === prev)) return prev;
        if (defaultCategoryId && cats.some((c) => c.id === defaultCategoryId)) {
          return defaultCategoryId;
        }
        return cats[0]?.id || "";
      });
    });

    return () => unsubscribe();
  }, [defaultCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setProductos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCurrentIndex(0);

    const productosRef = collection(db, "productos");
    const q = query(productosRef, where("categoria", "==", selectedCategoryId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(prods.slice(0, 5));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategoryId]);

  useEffect(() => {
    const updateVisibleCount = () => {
      setVisibleCount(window.innerWidth < 1024 ? 2 : 5);
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const maxIndex = Math.max(0, productos.length - visibleCount);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const scrollToIndex = (index: number) => {
    const container = carouselRef.current;
    if (!container) return;

    const firstItem = container.querySelector<HTMLElement>("[data-quick-product]");
    if (!firstItem) return;

    const step = firstItem.getBoundingClientRect().width + 8;
    container.scrollTo({ left: index * step, behavior: "smooth" });
  };

  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, visibleCount, productos.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const next = Math.max(0, prev - 1);
      scrollToIndex(next);
      return next;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const next = Math.min(maxIndex, prev + 1);
      scrollToIndex(next);
      return next;
    });
  };

  const cards = useMemo(
    () => productos.filter((producto: any) => producto && producto.id),
    [productos],
  );

  return (
    <section className="w-full m-0" style={{ backgroundColor:"black" }}>
      <div className="w-full px-3 sm:px-5 py-3 md:py-4 lg:py-4">


        <div className="mb-8 overflow-x-auto" ref={categoriesScrollRef}>
          <div className="flex gap-2 min-w-max">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                  selectedCategoryId === cat.id
                    ? "shadow-sm scale-105 bg-black text-white border border-black"
                    : "bg-white text-slate-900 border border-slate-300 hover:border-black/60 hover:shadow-sm"
                }`}
              >
                {cat.icono && <span className="mr-1">🏷️</span>}
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E0A11A]" />
          </div>
        ) : cards.length > 0 ? (
          <div className="relative">
            {maxIndex > 0 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-900 border border-slate-300 rounded-full p-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  <span className="material-icons-round text-sm">chevron_left</span>
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= maxIndex}
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-900 border border-slate-300 rounded-full p-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  <span className="material-icons-round text-sm">chevron_right</span>
                </button>
              </>
            )}

            <div
              ref={carouselRef}
              className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory px-2 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {cards.map((p: any) => (
                <div
                  key={p.id}
                  data-quick-product
                  className="flex-none snap-start w-[calc((100%-8px)/2)] lg:w-[calc((100%-32px)/5)]"
                >
                  <ProductoCard
                  key={p.id}
                  producto={p}
                  showCart
                  showEye
                  isCompact={false}
                  />
                </div>
              ))}
            </div>

            {maxIndex > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex
                        ? "bg-black w-6"
                        : "bg-slate-300 dark:bg-slate-600 w-2 hover:bg-slate-400 dark:hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No hay productos en esta categoría</p>
          </div>
        )}

        {cards.length > 0 && (
          <div className="text-center mt-10">
            <Link
              href={`/products-by-category?cat=${selectedCategoryId}`}
              className="inline-block px-6 py-3 rounded-lg font-semibold bg-white text-slate-900 border border-slate-300 hover:border-black/60 hover:shadow-md transition-all shadow-md"
            >
              Ver más productos
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

