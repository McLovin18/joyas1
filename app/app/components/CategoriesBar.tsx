"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
} from "../lib/categorias-db";
import { useUser } from "../context/UserContext";
import { useTracking } from "../lib/useAnalytics";

const CategoriesBar = () => {
  const { isAdmin, user } = useUser();
  const { trackCategoryClick } = useTracking();

  // Esperar a que cargue el usuario
  if (typeof user === "undefined") return null;

  let basePath = "/products-by-category";
  if (isAdmin) basePath = "/admin/products-by-category";

  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snap.docs)));
    });

    return () => unsub();
  }, []);


  return (
    <div
      className="hidden lg:block fixed top-23 bg-white dark:bg-black left-0 w-full z-30 border-b px-6 py-0 shadow-md"
      style={{
        background: "var(bg)",
        color: "var(--text)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center  justify-center gap-8 max-w-full overflow-visible no-scrollbar">
        {categorias.map((category) => (
          <div key={category.id} className="relative group dark:bg-black">
            {category.subcategorias && category.subcategorias.length > 0 ? (
              <>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors shadow-sm border"
                  style={{
                    background: "var(--cardBg)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                >
                  {category.icono && (
                    <span className="material-icons-round text-lg">{category.icono}</span>
                  )}
                  {category.nombre}
                  <span className="material-icons-round text-base">
                    expand_more
                  </span>
                </button>

                {/* Dropdown Subcategorías */}
                <div className="absolute left-0 top-full mt-0 min-w-55 bg-white dark:bg-black rounded-b-xl rounded-t-none shadow-lg border border-slate-200 dark:border-slate-700 z-40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                  <div className="py-2">
                    {category.subcategorias.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="relative group/submenu px-4 py-2 hover:bg-slate-100 dark:hover:bg-black cursor-pointer flex items-center gap-2"
                      >
                        <span className="material-icons-round text-base">
                          category
                        </span>
                        <span className="!text-black group-hover/submenu:!text-[#7b68ee] transition-colors">{sub.nombre}</span>

                        {/* Subsubcategorías */}
                        {sub.subcategorias &&
                          sub.subcategorias.length > 0 && (
                            <div className="absolute left-full top-0 min-w-45 bg-white dark:bg-black rounded-r-xl rounded-l-none shadow-lg border border-slate-200 dark:border-slate-700 z-50 opacity-0 group-hover/submenu:opacity-100 pointer-events-none group-hover/submenu:pointer-events-auto transition-all">
                              {sub.subcategorias.map((subsub: any) => (
                                <Link
                                  key={subsub.id}
                                  href={`${basePath}?cat=${category.id}&sub=${sub.id}&subsub=${subsub.id}`}
                                  onClick={() => trackCategoryClick().catch(console.error)}
                                  className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-black text-sm"
                                >
                                  {subsub.nombre}
                                </Link>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Link
                href={`${basePath}?cat=${category.id}`}
                onClick={() => trackCategoryClick().catch(console.error)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors shadow-sm border"
                style={{
                  background: "var(--cardBg)",
                  color: "var(--text)",
                  borderColor: "var(--border)",
                }}
              >
                {category.icono && (
                  <span className="material-icons-round text-lg">{category.icono}</span>
                )}
                {category.nombre}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesBar;
