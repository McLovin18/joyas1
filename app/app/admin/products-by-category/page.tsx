"use client";
import { useSearchParams } from "next/navigation";
import ProductoCard from "../../components/ProductoCard";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Producto } from "../../lib/productos-db";
import { obtenerProductos, obtenerProductosPorCategoria, obtenerProductosPorSubcategoria, obtenerProductosPorSubsubcategoria } from "../../lib/productos-db";
import { obtenerCategorias, sameCategoryId } from "../../lib/categorias-db";

export default function ProductsByCategoryPage() {
  const searchParams = useSearchParams();
  const categoria = (searchParams?.get("cat") || searchParams?.get("category") || "").trim();
  const subcategoria = (searchParams?.get("subcat") || searchParams?.get("subcategory") || searchParams?.get("sub") || "").trim();
  const subsubcategoria = (searchParams?.get("subsubcat") || searchParams?.get("subsubcategory") || searchParams?.get("subsub") || "").trim();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [orden, setOrden] = useState("price-high");
  const [showPrecio, setShowPrecio] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Fetch productos ───────────────────────────────
  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      let prods = [];
      if (subsubcategoria && subcategoria && categoria) {
        prods = await obtenerProductosPorSubsubcategoria(subsubcategoria, subcategoria, categoria);
      } else if (subcategoria && categoria) {
        prods = await obtenerProductosPorSubcategoria(subcategoria, categoria);
      } else if (categoria) {
        prods = await obtenerProductosPorCategoria(categoria);
      } else {
        prods = await obtenerProductos();
      }
      setProductos(prods);
      setLoading(false);
    }
    fetchProductos();
  }, [categoria, subcategoria, subsubcategoria]);

  // ── Chequear autenticación ───────────────────────
  useEffect(() => {
    // Reemplaza con tu lógica real de autenticación
    const loggedIn = Boolean(localStorage.getItem("token"));
    setIsAuthenticated(loggedIn);
  }, []);

  // ── Filtrado y orden ─────────────────────────────
  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p: any) => {
        // Validación estricta de jerarquía
        if (subsubcategoria && subcategoria && categoria) {
          if (
            !sameCategoryId(p.categoria, categoria) ||
            !sameCategoryId(p.subcategoria, subcategoria) ||
            !sameCategoryId(p.subsubcategoria, subsubcategoria)
          ) {
            return false;
          }
        } else if (subcategoria && categoria) {
          if (
            !sameCategoryId(p.categoria, categoria) ||
            !sameCategoryId(p.subcategoria, subcategoria)
          ) {
            return false;
          }
        } else if (categoria) {
          if (!sameCategoryId(p.categoria, categoria)) {
            return false;
          }
        }

        const texto = search.toLowerCase().trim();
        const matchTexto =
          !texto ||
          (p.nombre?.toLowerCase() || "").includes(texto) ||
          (p.descripcion?.toLowerCase() || "").includes(texto);

        const base = Number(p.precio || 0);
        const disc = Number(p.descuento || 0);
        const finalPrice = disc > 0 && disc < 100 ? base * (1 - disc / 100) : base;
        const min = precioMin ? parseFloat(precioMin) : null;
        const max = precioMax ? parseFloat(precioMax) : null;
        const matchMin = min === null || finalPrice >= min;
        const matchMax = max === null || finalPrice <= max;

        return matchTexto && matchMin && matchMax;
      })
      .sort((a: any, b: any) => {
        const fp = (p: any) => {
          const base = Number(p.precio || 0);
          const d = Number(p.descuento || 0);
          return d > 0 && d < 100 ? base * (1 - d / 100) : base;
        };
        if (orden === "price-low") return fp(a) - fp(b);
        if (orden === "price-high") return fp(b) - fp(a);
        if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
        return 0;
      });
  }, [productos, categoria, subcategoria, subsubcategoria, search, precioMin, precioMax, orden]);


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
    const paginatedProducts = productosFiltrados.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);




  const hasFilters = !!(search || precioMin || precioMax || orden !== "newest");

  const clearFilters = useCallback(() => {
    setSearch("");
    setPrecioMin("");
    setPrecioMax("");
    setOrden("newest");
  }, []);

  const ordenOpciones = [
    { value: "newest",     label: "Más nuevos"    },
    { value: "price-low",  label: "Menor precio"  },
    { value: "price-high", label: "Mayor precio"  },
  ];

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer select-none whitespace-nowrap ${
      active
        ? "bg-black border-black text-white shadow-sm"
        : "bg-white border-slate-300 text-slate-900 hover:border-black/60 hover:shadow-sm"
    }`;

  const inputCls =
    "px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all";

  // Estado para el mapeo de nombres
  const [catMap, setCatMap] = useState<any>({});
  const [subcatMap, setSubcatMap] = useState<any>({});
  const [subsubcatMap, setSubsubcatMap] = useState<any>({});

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

  return (
    <div className="min-h-screen flex flex-col mt-2 bg-white dark:bg-black text-slate-900 dark:text-white transition-colors">

      <main className="max-w-[1400px] mx-auto w-full px-3 sm:px-5 py-10 flex-1">

        {/* ── Cabecera ─────────────────────────────────────────── */}
        {(categoria || subcategoria || subsubcategoria) && (
          <div className="mb-4">
            <nav className="flex items-center gap-1 text-xs text-slate-400 dark:text-white/30 mb-1 select-none">
              <span className="hover:underline cursor-pointer" onClick={() => window.location.href = '/admin/products-by-category'}>Categorías</span>
              {categoria && (
                <>
                  <span className="mx-1">›</span>
                  <span className="hover:underline cursor-pointer" onClick={() => window.location.href = `/admin/products-by-category?cat=${encodeURIComponent(categoria)}`}>{getCategoryName(categoria)}</span>
                </>
              )}
              {subcategoria && (
                <>
                  <span className="mx-1">›</span>
                  <span className="hover:underline cursor-pointer" onClick={() => window.location.href = `/admin/products-by-category?cat=${encodeURIComponent(categoria)}&subcat=${encodeURIComponent(subcategoria)}`}>{getSubcategoryName(subcategoria)}</span>
                </>
              )}
              {subsubcategoria && (
                <>
                  <span className="mx-1">›</span>
                  <span className="font-semibold text-slate-600 dark:text-white/80">{getSubsubcategoryName(subsubcategoria)}</span>
                </>
              )}
            </nav>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              {subsubcategoria
                ? getSubsubcategoryName(subsubcategoria)
                : subcategoria
                  ? getSubcategoryName(subcategoria)
                  : getCategoryName(categoria)}
            </h1>
          </div>
        )}

        {/* ── Filtros horizontales ─────────────────────────────── */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-6 sm:py-15 mb-5 space-y-3">

          {/* Fila 1: buscador + precio + limpiar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-[min(75vw,300px)] sm:max-w-sm">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 text-[17px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} w-full pl-9 pr-8`}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/80"
                >
                  <span className="material-icons-round text-[15px]">close</span>
                </button>
              )}
            </div>

            {/* Toggle precio */}
            <button
              onClick={() => setShowPrecio((v) => !v)}
              className={chip(showPrecio || !!(precioMin || precioMax))}
            >
              <span className="material-icons-round text-[15px]">attach_money</span>
              Precio
              {(precioMin || precioMax) && !showPrecio && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
              )}
            </button>

            {/* Limpiar */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all whitespace-nowrap"
              >
                <span className="material-icons-round text-[14px]">close</span>
                Limpiar
              </button>
            )}
          </div>

          {/* Precio expandible */}
          {showPrecio && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-white/40 font-medium">Rango:</span>
              <input
                type="number"
                placeholder="Mín"
                value={precioMin}
                onChange={(e) => setPrecioMin(e.target.value)}
                min={0}
                className={`${inputCls} w-24`}
              />
              <span className="text-slate-300 dark:text-white/20">—</span>
              <input
                type="number"
                placeholder="Máx"
                value={precioMax}
                onChange={(e) => setPrecioMax(e.target.value)}
                min={0}
                className={`${inputCls} w-24`}
              />
            </div>
          )}

          {/* Fila 2: orden + conteo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 dark:text-white/30 font-medium">Ordenar:</span>
            {ordenOpciones.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrden(opt.value)}
                className={chip(orden === opt.value)}
              >
                {opt.label}
              </button>
            ))}
            {!loading && (
              <span className="ml-auto text-xs text-slate-400 dark:text-white/75 tabular-nums">
                {productosFiltrados.length}{" "}
                {productosFiltrados.length === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>
        </div>

        {/* ── Grid de productos ─────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 h-60 animate-pulse"
              />
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <span className="material-icons-round text-3xl text-slate-300 dark:text-white/20">
                search_off
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-white/80">Sin resultados</p>
              <p className="text-sm text-slate-400 dark:text-white/30 mt-1 max-w-[240px]">
                Prueba otros términos o ajusta los filtros de precio
              </p>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-500 dark:text-purple-400 underline underline-offset-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
            <>
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-in fade-in duration-700`}>
              {paginatedProducts.map((p: any) => (
                <ProductoCard
                  key={p.id}
                  producto={p}
                  showCart
                  showEye
                  showFav={isAuthenticated}
                  isCompact={false}
                />
              ))}
            </div>
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-wrap justify-center items-center gap-2 mt-8 select-none w-full">
                <button
                  className="px-3 py-1.5 rounded border text-xs font-medium bg-white border-slate-300 text-slate-900 hover:border-black/60 transition-all disabled:opacity-40"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-all ${currentPage === n ? 'bg-black border-black text-white shadow-sm' : 'bg-white border-slate-300 text-slate-900 hover:border-black/60'}`}
                    onClick={() => setCurrentPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="px-3 py-1.5 rounded border text-xs font-medium bg-white border-slate-300 text-slate-900 hover:border-black/60 transition-all disabled:opacity-40"
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

