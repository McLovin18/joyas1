"use client";
import BottomBarPublic from "../components/BottomBarPublic";
import { useUser } from "../context/UserContext";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import ProductoCard from "../components/ProductoCard";
import { Loading3DIcon } from "../components/Loading3DIcon";
import { obtenerProductos } from "../lib/productos-db";
import { productMatches } from "../lib/search-utils";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
  sameCategoryId,
  productMatchesCategoria,
  productMatchesSubcategoria,
} from "../lib/categorias-db";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

// Categoría de "Trabajos entregados" — solo debe mostrarse en la grilla
// de productos cuando el usuario la selecciona explícitamente, nunca en "Todos".
const TRABAJOS_ENTREGADOS_CAT_ID = "1785564342207";

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get("query") || "";
  const categoriaFromUrl = (searchParams?.get("cat") || searchParams?.get("category") || "").trim();
  const subcategoriaFromUrl = (searchParams?.get("subcat") || searchParams?.get("subcategory") || searchParams?.get("sub") || "").trim();
  const isLogger = useUser();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(queryParam);
  const [orden, setOrden] = useState("price-high");
  const [categorias, setCategorias] = useState<any[]>([]);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  // Estado local de categoría/subcategoría (responde al instante, igual que en /productos)
  const [filterCat, setFilterCat] = useState(categoriaFromUrl);
  const [filterSub, setFilterSub] = useState(subcategoriaFromUrl);

  useEffect(() => {
    setFilterCat(categoriaFromUrl);
    setFilterSub(subcategoriaFromUrl);
  }, [categoriaFromUrl, subcategoriaFromUrl]);

  const categoriaId = filterCat;
  const subcategoriaId = filterSub;

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

  const buildUrl = useCallback(
    (catId: string, subId: string) => {
      const params = new URLSearchParams();
      if (queryParam) params.set("query", queryParam);
      if (catId) params.set("cat", catId);
      if (subId) params.set("sub", subId);
      const qs = params.toString();
      return `/search-results${qs ? `?${qs}` : ""}`;
    },
    [queryParam]
  );

  const selectCategoria = useCallback(
    (catId: string) => {
      setFilterCat(catId);
      setFilterSub("");
      router.replace(buildUrl(catId, ""), { scroll: false });
    },
    [router, buildUrl]
  );

  const selectTodas = useCallback(() => {
    setFilterCat("");
    setFilterSub("");
    router.replace(buildUrl("", ""), { scroll: false });
  }, [router, buildUrl]);

  // Abre el dropdown móvil calculando la posición real del círculo en pantalla
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
        Math.max(rect.left + rect.width / 2 - dropdownWidth / 2, 16),
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

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  // 🔥 Cargar productos
  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      const prods = await obtenerProductos();
      setProductos(prods);
      setLoading(false);
    }
    fetchProductos();
  }, []);

  // 🔥 Cargar categorías
  useEffect(() => {
    const categoriasRef = collection(db, "categorias");
    const q = query(categoriasRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snapshot.docs)));
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Filtrado
  const productosFiltrados = useMemo(() => {
    return productos
      .filter(p => {
        const coincideTexto = productMatches(p, search);

        let coincideCategoria = true;
        if (categoriaId && categorias.length > 0) {
          coincideCategoria = productMatchesCategoria(p, categoriaId, categorias);
          if (coincideCategoria && subcategoriaId) {
            coincideCategoria = productMatchesSubcategoria(
              p,
              categoriaId,
              subcategoriaId,
              categorias
            );
          }
        } else if (categoriaId) {
          coincideCategoria = sameCategoryId(p.categoria, categoriaId);
        } else {
          // "Todas": excluir siempre los productos de "Trabajos entregados"
          coincideCategoria = !productMatchesCategoria(p, TRABAJOS_ENTREGADOS_CAT_ID, categorias);
        }

        return coincideTexto && coincideCategoria;
      })
      .sort((a, b) => {
        const getFinalPrice = (p: any) => {
          const base = Number(p.precio || 0);
          const disc = Number(p.descuento || 0);
          return disc > 0 && disc < 100 ? base * (1 - disc / 100) : base;
        };
        if (orden === "price-low") return getFinalPrice(a) - getFinalPrice(b);
        if (orden === "price-high") return getFinalPrice(b) - getFinalPrice(a);
        if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
        return 0;
      });
  }, [productos, search, orden, categoriaId, subcategoriaId, categorias]);



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
      useEffect(() => {
        setCurrentPage(1);
      }, [productosFiltrados.length, categoriaId, subcategoriaId]);
      const totalPages = Math.ceil(productosFiltrados.length / productsPerPage);
      const paginatedProducts = productosFiltrados.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  return (
    <div className="min-h-screen flex flex-col transition-colors bg-black text-white">
      <BottomBarPublic/>

      <main className="max-w-7xl mx-auto w-full px-3 sm:px-5 py-6 sm:py-15 flex-1">
        {queryParam && (
          <p className="text-sm text-white/50 mb-4">
            Resultados para <span className="text-white font-semibold">"{queryParam}"</span>
          </p>
        )}

        {/* ── Categorías — círculos, con subcategorías vía hover (desktop) o click (mobile, portal) ── */}
        {categorias.length > 0 && (
          <div className="mb-8 relative z-50">
            <div
              ref={categoriesScrollRef}
              className="mt-2 w-full max-w-full flex items-center justify-start sm:justify-center gap-4 overflow-x-auto overflow-y-hidden pb-2 pl-4 pr-4 -mx-3 sm:mx-0 sm:px-3 sm:pr-2 no-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <button
                type="button"
                onClick={selectTodas}
                className="flex flex-col items-center w-24 shrink-0 select-none"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 shadow-sm flex items-center justify-center ${
                    !categoriaId
                      ? "border-red-600 ring-2 ring-white/20"
                      : "border-white/20"
                  } bg-black`}
                >
                  <span className="text-xs font-bold tracking-wide text-white/80">
                    TODOS
                  </span>
                </div>

                <span
                  className={`mt-2 text-sm ${
                    !categoriaId ? "text-white" : "text-white/70"
                  } text-center`}
                >
                  Todos
                </span>
              </button>

              {categorias.map((cat) => {
                const selected = sameCategoryId(categoriaId, cat.id);
                const hasSubcats = cat.subcategorias && cat.subcategorias.length > 0;

                return (
                  <div
                    key={cat.id}
                    className="relative shrink-0"
                    onMouseEnter={() => !isMobile && setHoveredCatId(cat.id)}
                    onMouseLeave={() => !isMobile && setHoveredCatId(null)}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        catButtonRefs.current[cat.id] = el;
                      }}
                      onClick={() => {
                        if (isMobile && hasSubcats) {
                          openMobileSubcats(cat.id);
                        } else {
                          selectCategoria(cat.id);
                        }
                      }}
                      className="flex flex-col items-center w-24 select-none"
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
                            <span className="text-2xl font-black text-white/70">
                              {cat.nombre.slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <span
                        className={`mt-2 text-sm flex items-center gap-1 ${
                          selected ? "text-white" : "text-white/70"
                        } text-center leading-tight`}
                      >
                        {cat.nombre}
                        {hasSubcats && <span className="text-[10px]">▼</span>}
                      </span>
                    </button>

                    {/* Dropdown desktop: hover */}
                    {!isMobile && hasSubcats && hoveredCatId === cat.id && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black border border-white/15 rounded-xl shadow-xl z-[99999] min-w-[200px] max-h-[300px] overflow-y-auto py-2">
                        {cat.subcategorias.map((sub: any) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterCat(cat.id);
                              setFilterSub(sub.id);
                              router.replace(buildUrl(cat.id, sub.id), { scroll: false });
                              setHoveredCatId(null);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                              subcategoriaId === sub.id
                                ? "bg-red-600 text-white"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            {sub.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dropdown móvil: vía portal en document.body, posicionado con coordenadas reales del círculo. Escapa del scroll horizontal del carrusel y no se cierra al hacer scroll dentro de sí mismo. */}
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
                className="bg-black border border-white/15 rounded-xl shadow-xl z-[99999] max-h-[300px] overflow-y-auto py-2"
              >
                {hoveredCat.subcategorias.map((sub: any) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterCat(hoveredCat.id);
                      setFilterSub(sub.id);
                      router.replace(buildUrl(hoveredCat.id, sub.id), { scroll: false });
                      closeMobileSubcats();
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      subcategoriaId === sub.id
                        ? "bg-red-600 text-white"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {sub.nombre}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loading3DIcon />
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="material-icons-round text-3xl text-white/20">search_off</span>
                </div>
                <div>
                  <p className="font-semibold text-white/80">Sin resultados</p>
                  <p className="text-sm text-white/30 mt-1 max-w-60">Prueba con otro término de búsqueda</p>
                </div>
              </div>
            ) : (
          <>
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 animate-in fade-in duration-700">
                {paginatedProducts.map((p: any) => (
                <ProductoCard
                  key={p.id}
                  producto={p}
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