"use client";
import BottomBarPublic from "../components/BottomBarPublic";
import ProductoCard from "../components/ProductoCard";
import { Loading3DIcon } from "../components/Loading3DIcon";
import { useRouter, useSearchParams } from "next/navigation";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import { obtenerProductos } from "../lib/productos-db";
import {
  obtenerCategorias,
  mapCategorySnapshot,
  sortCategoriasByOrder,
  sameCategoryId,
  productMatchesCategoria,
  productMatchesSubcategoria,
  productMatchesSubsubcategoria,
} from "../lib/categorias-db";
import { useUser } from "../context/UserContext";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

// Categoría de "Trabajos entregados" — solo debe mostrarse en la grilla
// de productos cuando el usuario la selecciona explícitamente, nunca en "Todos".
const TRABAJOS_ENTREGADOS_CAT_ID = "1785564342207";

export default function ProductsByCategoryPage() {
  // Estado para el mapeo de nombres
  const [catMap, setCatMap] = useState<any>({});
  const [subcatMap, setSubcatMap] = useState<any>({});
  const [subsubcatMap, setSubsubcatMap] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    async function fetchCategorias() {
      const cats = await obtenerCategorias();
      const catObj: any = {};
      const subcatObj: any = {};
      const subsubcatObj: any = {};
      cats.forEach((cat: any) => {
        catObj[cat.id] = cat.nombre || cat.id;
        if (cat.subcategorias) {
          cat.subcategorias.forEach((sub: any) => {
            subcatObj[sub.id] = sub.nombre || sub.id;
            if (sub.subcategorias) {
              sub.subcategorias.forEach((subsub: any) => {
                subsubcatObj[subsub.id] = subsub.nombre || subsub.id;
              });
            }
          });
        }
      });
      setCatMap(catObj);
      setSubcatMap(subcatObj);
      setSubsubcatMap(subsubcatObj);
    }
    fetchCategorias();
  }, []);

  function getCategoryName(id: string) {
    return catMap[id] || id;
  }
  function getSubcategoryName(id: string) {
    return subcatMap[id] || id;
  }
  function getSubsubcategoryName(id: string) {
    return subsubcatMap[id] || id;
  }



  const isLogged = useUser();
  const searchParams = useSearchParams();

  const categoriaFromUrl = (searchParams?.get("cat") || searchParams?.get("category") || "").trim();
  const subcategoriaFromUrl = (searchParams?.get("subcat") || searchParams?.get("subcategory") || searchParams?.get("sub") || "").trim();
  const subsubcategoriaFromUrl = (searchParams?.get("subsubcat") || searchParams?.get("subsubcategory") || searchParams?.get("subsub") || "").trim();

  // Estado local: responde al click al instante (router.push a veces no actualiza searchParams en la misma ruta)
  const [filterCat, setFilterCat] = useState(categoriaFromUrl);
  const [filterSub, setFilterSub] = useState(subcategoriaFromUrl);
  const [filterSubsub, setFilterSubsub] = useState(subsubcategoriaFromUrl);

  useEffect(() => {
    setFilterCat(categoriaFromUrl);
    setFilterSub(subcategoriaFromUrl);
    setFilterSubsub(subsubcategoriaFromUrl);
  }, [categoriaFromUrl, subcategoriaFromUrl, subsubcategoriaFromUrl]);

  const categoriaId = filterCat;
  const subcategoriaId = filterSub;
  const subsubcategoriaId = filterSubsub;
  
  // Leer parámetros de precio DIRECTAMENTE desde URL
  const urlMinPrice = searchParams?.get("minPrice") || "";
  const urlMaxPrice = searchParams?.get("maxPrice") || "";

  // --- Estados de datos ---
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // --- Estados de filtros ---
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [orden, setOrden] = useState("price-high");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  // --- Estados del selector de categorías (hover desktop / click + portal mobile) ---
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const catButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cierra el dropdown móvil solo si el scroll/resize ocurre FUERA del propio dropdown
  useEffect(() => {
    if (!isMobile || !hoveredCatId) return;
    const close = (e: Event) => {
      if (
        mobileDropdownRef.current &&
        e.target instanceof Node &&
        mobileDropdownRef.current.contains(e.target)
      ) {
        return;
      }
      setHoveredCatId(null);
      setDropdownPos(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isMobile, hoveredCatId]);

  // 1. Control de Montaje - Inicializa filtros desde URL
  useEffect(() => {
    setIsMounted(true);
    const loggedIn = Boolean(localStorage.getItem("token"));
    setIsAuthenticated(loggedIn);
    
    // Sincronizar filtros de precio desde URL params después del montaje
    const minPrice = searchParams?.get("minPrice") || "";
    const maxPrice = searchParams?.get("maxPrice") || "";
    if (minPrice) setPrecioMin(minPrice);
    if (maxPrice) setPrecioMax(maxPrice);
  }, [searchParams]);

  const selectCategoria = useCallback(
    (catId: string) => {
      setFilterCat(catId);
      setFilterSub("");
      setFilterSubsub("");
      const url = catId
        ? `/products-by-category?cat=${encodeURIComponent(catId)}`
        : "/products-by-category";
      router.replace(url, { scroll: false });
    },
    [router]
  );

  const selectTodas = useCallback(() => {
    setFilterCat("");
    setFilterSub("");
    setFilterSubsub("");
    router.replace("/products-by-category", { scroll: false });
  }, [router]);

  // Abre el dropdown móvil calculando la posición real del botón en pantalla
  const openMobileSubcats = useCallback((catId: string) => {
    if (hoveredCatId === catId) {
      setHoveredCatId(null);
      setDropdownPos(null);
      return;
    }
    const btn = catButtonRefs.current[catId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const dropdownWidth = 220;
      const left = Math.min(
        Math.max(rect.left, 16),
        window.innerWidth - dropdownWidth - 16
      );
      setDropdownPos({
        top: rect.bottom + 6,
        left,
        width: dropdownWidth,
      });
    }
    setHoveredCatId(catId);
  }, [hoveredCatId]);

  const closeMobileSubcats = useCallback(() => {
    setHoveredCatId(null);
    setDropdownPos(null);
  }, []);

  const hoveredCat = categorias.find((c) => c.id === hoveredCatId);

  // 2. Fetch productos (siempre catálogo completo + filtro por árbol de categorías)
  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      try {
        const all = await obtenerProductos();
        let prods = all;

        if (categoriaId && categorias.length > 0) {
          prods = prods.filter((p) =>
            productMatchesCategoria(p, categoriaId, categorias)
          );
          if (subcategoriaId) {
            prods = prods.filter((p) =>
              productMatchesSubcategoria(
                p,
                categoriaId,
                subcategoriaId,
                categorias
              )
            );
          }
          if (subsubcategoriaId) {
            prods = prods.filter((p) =>
              productMatchesSubsubcategoria(
                p,
                categoriaId,
                subcategoriaId,
                subsubcategoriaId,
                categorias
              )
            );
          }
        } else if (categoriaId) {
          const needle = categoriaId.trim().toLowerCase();
          prods = all.filter(
            (p) =>
              String(p.categoria || "").trim().toLowerCase() === needle
          );
        }

        setProductos(prods || []);
      } catch {
        setProductos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProductos();
  }, [categoriaId, subcategoriaId, subsubcategoriaId, categorias]);

  // 2.5. Cargar categorías
  useEffect(() => {
    const categoriasRef = collection(db, "categorias");
    const q = query(categoriasRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snapshot.docs)));
    });

    return () => unsubscribe();
  }, []);

  // 3. Filtrado y orden (Memoizado)
  const productosFiltrados = useMemo(() => {
    // Usar URL params primero, luego estado local como fallback
    const effectiveMin = urlMinPrice || precioMin;
    const effectiveMax = urlMaxPrice || precioMax;
    
    const minNum = effectiveMin && effectiveMin !== "" ? parseFloat(effectiveMin) : null;
    const maxNum = effectiveMax && effectiveMax !== "" ? parseFloat(effectiveMax) : null;
    
    const filtered = productos
      .filter((p: any) => {
        // Filtrado estricto por ID
        if (categoriaId && categorias.length > 0) {
          if (!productMatchesCategoria(p, categoriaId, categorias)) return false;
          if (
            subcategoriaId &&
            !productMatchesSubcategoria(
              p,
              categoriaId,
              subcategoriaId,
              categorias
            )
          ) {
            return false;
          }
          if (
            subsubcategoriaId &&
            !productMatchesSubsubcategoria(
              p,
              categoriaId,
              subcategoriaId,
              subsubcategoriaId,
              categorias
            )
          ) {
            return false;
          }
        } else if (categoriaId) {
          if (!sameCategoryId(p.categoria, categoriaId)) return false;
        } else {
          // "Todas": excluir siempre los productos de "Trabajos entregados"
          if (productMatchesCategoria(p, TRABAJOS_ENTREGADOS_CAT_ID, categorias)) {
            return false;
          }
        }

        const basePrice = Number(p.precio || 0);
        
        const matchMin = minNum === null || basePrice >= minNum;
        const matchMax = maxNum === null || basePrice <= maxNum;

        return matchMin && matchMax;
      })
      .sort((a: any, b: any) => {
        const basePrice = (p: any) => Number(p.precio || 0);
        if (orden === "price-low") return basePrice(a) - basePrice(b);
        if (orden === "price-high") return basePrice(b) - basePrice(a);
        return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0);
      });
    return filtered;
  }, [productos, categoriaId, subcategoriaId, subsubcategoriaId, categorias, precioMin, precioMax, orden, urlMinPrice, urlMaxPrice]);

    // --- Paginación responsive: 10 productos en móvil, cols*3 en desktop ---
    const [currentPage, setCurrentPage] = useState(1);
    const getProductsPerPage = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) return 10; // móvil
        if (window.innerWidth >= 1024) return 4 * 3; // lg: 4 cols x 3 filas
        if (window.innerWidth >= 768) return 3 * 3; // md: 3 cols x 3 filas
        if (window.innerWidth >= 640) return 2 * 3; // sm: 2 cols x 3 filas
      }
      return 10;
    };
    const [productsPerPage, setProductsPerPage] = useState(getProductsPerPage());
    useEffect(() => {
      function handleResize() {
        setProductsPerPage(getProductsPerPage());
      }
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const totalPages = Math.ceil(productosFiltrados.length / productsPerPage);
    
    // Resetear a página 1 cuando cambia el filtro
    useEffect(() => {
      setCurrentPage(1);
    }, [productosFiltrados.length, categoriaId, subcategoriaId, subsubcategoriaId, urlMinPrice, urlMaxPrice]);
    
    const paginatedProducts = useMemo(() => {
      return productosFiltrados.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);
    }, [productosFiltrados, currentPage, productsPerPage]);

  return (
    <div className="min-h-screen flex flex-col transition-colors bg-black text-white">
        <BottomBarPublic />

      <main className="max-w-350 mx-auto w-full px-3 sm:px-5 py-8 flex-1">
        {/* Cabecera */}

        {/* Categorías */}
        {categorias.length > 0 && (
          <div className="mb-6 relative z-50">
            <div className={`${isMobile && !hoveredCatId ? 'overflow-x-auto' : ''} ${isMobile && hoveredCatId ? 'overflow-hidden' : ''} pb-2`}>
              <div className="flex gap-2 min-w-max">
                <button
                  type="button"
                  onClick={selectTodas}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                    !categoriaId
                      ? "shadow-sm scale-105 bg-red-600 text-white border border-red-600"
                      : "bg-white text-slate-900 border border-slate-300 hover:border-red-600/60 hover:shadow-sm"
                  }`}
                >
                  Todas
                </button>
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => !isMobile && setHoveredCatId(cat.id)}
                    onMouseLeave={() => !isMobile && setHoveredCatId(null)}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        catButtonRefs.current[cat.id] = el;
                      }}
                      onClick={() => {
                        if (isMobile && cat.subcategorias && cat.subcategorias.length > 0) {
                          openMobileSubcats(cat.id);
                        } else {
                          selectCategoria(cat.id);
                        }
                      }}
                      className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all ${
                        sameCategoryId(categoriaId, cat.id)
                          ? "shadow-sm scale-105 bg-red-600 text-white border border-red-600"
                          : "bg-white text-slate-900 border border-slate-300 hover:border-red-600/60 hover:shadow-sm"
                      }`}
                    >
                      {cat.icono && <span className="mr-1">🏷️</span>}
                      {cat.nombre}
                      {cat.subcategorias && cat.subcategorias.length > 0 && (
                        <span className="ml-1 text-xs">▼</span>
                      )}
                    </button>

                    {/* Dropdown desktop: se mantiene igual (funciona bien) */}
                    {!isMobile && cat.subcategorias && cat.subcategorias.length > 0 && hoveredCatId === cat.id && (
                      <div className="absolute top-full mt-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[99999] min-w-[200px] max-h-[300px] overflow-y-auto py-2">
                        {cat.subcategorias.map((sub: any) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterCat(cat.id);
                              setFilterSub(sub.id);
                              setFilterSubsub("");
                              router.replace(`/products-by-category?cat=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub.id)}`, { scroll: false });
                              setHoveredCatId(null);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                              subcategoriaId === sub.id
                                ? "bg-red-600 text-white"
                                : "text-slate-900 hover:bg-slate-100"
                            }`}
                          >
                            {sub.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dropdown móvil: renderizado vía portal en document.body, posicionado con coordenadas reales del botón. Así escapa del scroll horizontal del carrusel de categorías y no se cierra al hacer scroll dentro de sí mismo. */}
        {isMobile && hoveredCatId && dropdownPos && hoveredCat?.subcategorias?.length > 0 &&
          typeof document !== "undefined" &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[99998]"
                onClick={closeMobileSubcats}
              />
              <div
                ref={mobileDropdownRef}
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                }}
                className="bg-white border border-slate-200 rounded-xl shadow-xl z-[99999] max-h-[300px] overflow-y-auto py-2"
              >
                {hoveredCat.subcategorias.map((sub: any) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterCat(hoveredCat.id);
                      setFilterSub(sub.id);
                      setFilterSubsub("");
                      router.replace(
                        `/products-by-category?cat=${encodeURIComponent(hoveredCat.id)}&sub=${encodeURIComponent(sub.id)}`,
                        { scroll: false }
                      );
                      closeMobileSubcats();
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      subcategoriaId === sub.id
                        ? "bg-red-600 text-white"
                        : "text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {sub.nombre}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}

        {/* Grid de productos o Loading */}
        {(!isMounted || loading) ? (
          <div className="flex flex-col items-center justify-center py-32 transition-opacity duration-500">
            <Loading3DIcon />
            <p className="text-xs text-white/30 mt-6 font-medium tracking-widest uppercase">Cargando catálogo</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <span className="material-icons-round text-3xl text-white/20">search_off</span>
            </div>
            <div>
              <p className="font-semibold text-white/80">Sin resultados</p>
              <p className="text-sm text-white/30 mt-1 max-w-60">No hay productos en esta categoría</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 animate-in fade-in duration-700`}>
              {paginatedProducts.map((p: any) => (
                <ProductoCard
                  key={p.id}
                  producto={p}
                  showFav={isAuthenticated}
                  isCompact={false}
                />
              ))}
            </div>
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-wrap justify-center items-center gap-2 mt-8 select-none w-full">
                <button
                  className="px-3 py-1.5 rounded border text-xs font-medium bg-black border-white/15 text-white hover:border-red-600 transition-all disabled:opacity-40"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-all ${currentPage === n ? 'bg-red-600 border-red-600 text-white shadow-sm' : 'bg-black border-white/15 text-white hover:border-red-600'}`}
                    onClick={() => setCurrentPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="px-3 py-1.5 rounded border text-xs font-medium bg-black border-white/15 text-white hover:border-red-600 transition-all disabled:opacity-40"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </main>
      
    </div>
    
  );
}