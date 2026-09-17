"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
} from "../lib/categorias-db";
import { useUser } from "../context/UserContext";
import { useTracking } from "../lib/useAnalytics";

const CategoriesBarMobile = () => {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSubcategory, setOpenSubcategory] = useState<string | null>(null);
  const { trackCategoryClick } = useTracking();

  const { isAdmin, user } = useUser();
  if (typeof user === "undefined") return null;
  const basePath = isAdmin
    ? "/admin/products-by-category"
    : "/products-by-category";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snap.docs)));
    });
    return () => unsub();
  }, []);

  return (
    <div className="lg:hidden sticky top-16 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-4 py-3">
      <div className="flex flex-col gap-2">
        {categorias.map((category) => (
          <div key={category.id} className="relative">
            {!category.subcategorias?.length ? (
              <Link
                href={`${basePath}?cat=${category.id}`}
                onClick={() => trackCategoryClick().catch(console.error)}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-medium"
              >
                {category.icono && (
                  <span className="material-icons-round text-base">
                    {category.icono}
                  </span>
                )}
                <span>{category.nombre}</span>
              </Link>
            ) : (
            <button
              className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-medium"
              type="button"
              onClick={() =>
                setOpenCategory(
                  openCategory === category.id ? null : category.id
                )
              }
            >
              <span className="flex items-center gap-2">
                {category.icono && (
                  <span className="material-icons-round text-base">
                    {category.icono}
                  </span>
                )}
                <span>{category.nombre}</span>
              </span>
              <span className="material-icons-round text-base">
                {openCategory === category.id ? "expand_less" : "expand_more"}
              </span>
            </button>
            )}

            {category.subcategorias?.length > 0 && openCategory === category.id && (
              <div className="ml-4 space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 my-1">
                {category.subcategorias.map((subcat: any) => (
                  <div key={subcat.id} className="relative">
                    {subcat.subcategorias?.length > 0 ? (
                      <>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                          type="button"
                          onClick={() =>
                            setOpenSubcategory(
                              openSubcategory === subcat.id ? null : subcat.id
                            )
                          }
                        >
                          <span>{subcat.nombre}</span>
                          <span className="material-icons-round text-base">
                            {openSubcategory === subcat.id
                              ? "expand_less"
                              : "expand_more"}
                          </span>
                        </button>
                        {openSubcategory === subcat.id && (
                          <div className="ml-4 space-y-1">
                            {subcat.subcategorias.map((subsubcat: any) => (
                              <Link
                                key={subsubcat.id}
                                href={`${basePath}?cat=${category.id}&sub=${subcat.id}&subsub=${subsubcat.id}`}
                                onClick={() =>
                                  trackCategoryClick().catch(console.error)
                                }
                                className="block px-3 py-2 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                {subsubcat.nombre}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={`${basePath}?cat=${category.id}&sub=${subcat.id}`}
                        onClick={() =>
                          trackCategoryClick().catch(console.error)
                        }
                        className="block px-3 py-2 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        {subcat.nombre}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesBarMobile;
