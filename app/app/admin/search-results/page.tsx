"use client"
import CategoriesBar from "../../components/CategoriesBar";
import ProductoCard from "../../components/ProductoCard";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { obtenerProductos } from "../../lib/productos-db";
import { productMatches } from "../../lib/search-utils";

export default function SearchResultsPage() {
  const [productos, setProductos] = useState([]);
  const [orden, setOrden] = useState("newest");
  const [marca, setMarca] = useState("");
  const [marcas, setMarcas] = useState([]);
  const searchParams = useSearchParams();
  const query = searchParams?.get("query") || "";

  useEffect(() => {
    obtenerProductos().then(prods => {
      setProductos(prods);
      // Extraer marcas únicas
      const marcasUnicas = Array.from(new Set(prods.map(p => p.marca).filter(Boolean)));
      setMarcas(marcasUnicas);
    });
  }, []);

  // Filtros
  let productosFiltrados = productos.filter(p => {
    if (!query.trim()) return false; // Si no hay query, no mostrar nada
    return productMatches(p, query);
  });
  if (orden === "price-low") productosFiltrados = productosFiltrados.sort((a, b) => a.precio - b.precio);
  if (orden === "price-high") productosFiltrados = productosFiltrados.sort((a, b) => b.precio - a.precio);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }} className="min-h-screen flex flex-col mt-2">
      <CategoriesBar />
      <main className="px-4 lg:px-6 py-6 sm:py-12 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <a href="/" className="text-sm text-slate-500 dark:text-white hover:text-accent">Inicio</a>
          <span className="text-slate-500 dark:text-white">/</span>
          <span className="text-sm font-medium text-accent">Búsqueda</span>
        </div>
        {/* Filtros y opciones */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Resultados de búsqueda</h1>
            <input
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-full mt-2"
              placeholder="Buscar productos..."
              value={query}
              readOnly
            />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <select className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="newest">Más Nuevos</option>
              <option value="price-low">Menor Precio</option>
              <option value="price-high">Mayor Precio</option>
              {/* <option value="popular">Más Popular</option> */}
            </select>
            <select className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={marca} onChange={e => setMarca(e.target.value)}>
              <option value="">Todas las marcas</option>
              {marcas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {/* Grid de productos */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {productosFiltrados.length > 0 ? (
            productosFiltrados.map(p => <ProductoCard key={p.id} producto={p} showCart showEye showFav isCompact={false} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <span className="material-icons-round text-5xl opacity-20">search</span>
              <h3 className="text-lg font-semibold mt-4">No encontramos productos</h3>
              <p className="text-sm text-slate-500 dark:text-white">No hay productos que coincidan con tu búsqueda</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

