"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import InfoSlider from "./InfoSlider";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  mapCategorySnapshot,
  sortCategoriasByOrder,
} from "../lib/categorias-db";
import { obtenerProductos } from "../lib/productos-db";
import { useUser } from "../context/UserContext";
import { productMatches } from "../lib/search-utils";

// ─────────────────────────────────────────────
// Paleta de marca — Tienda Virtual
// ─────────────────────────────────────────────
const BRAND = {
  bg: "#000000",
  bgSoft: "#0a0a0a",
  gold: "#e11d1d",
  goldBright: "#ff3b3b",
  border: "rgba(255,255,255,0.1)",
  borderSoft: "rgba(255,255,255,0.08)",
  white: "#ffffff",
  textMuted: "rgba(255,255,255,0.5)",
};


// ─────────────────────────────────────────────
// Navbar principal
// ─────────────────────────────────────────────
export const Navbar = () => {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openCatId, setOpenCatId] = useState<string | null>(null);
  const [openSubId, setOpenSubId] = useState<string | null>(null);
  const { user, carrito } = useUser();
  const [windowWidth, setWindowWidth] = useState<number | null>(null);

  // Barra de búsqueda
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Categorías integradas
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    obtenerProductos().then((prods) => setAllProducts(prods));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(sortCategoriasByOrder(mapCategorySnapshot(snap.docs)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    const handleActivateSearch = () => {
      setSearchOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    };
    window.addEventListener("activateNavbarSearch", handleActivateSearch);
    return () => window.removeEventListener("activateNavbarSearch", handleActivateSearch);
  }, [windowWidth]);

  useEffect(() => {
    if (!searchValue.trim()) { setSuggestions([]); return; }
    setSearchLoading(true);
    const filtered = allProducts.filter((p) => productMatches(p, searchValue));
    setSuggestions(filtered.slice(0, 6));
    setSearchLoading(false);
  }, [searchValue, allProducts]);

  if (!mounted) return null;

  const isAdmin = user?.role === "admin";
  const basePath = isAdmin
    ? "/admin/products-by-category"
    : "/products-by-category";

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/productos", label: "Productos" },


  ];


  const handleSearch = () => {
    if (!searchValue.trim()) return;
    let target = `/search-results?query=${encodeURIComponent(searchValue.trim())}`;
    if (isAdmin) target = `/admin/search-results?query=${encodeURIComponent(searchValue.trim())}`;
    window.location.href = target;
    setSearchValue("");
    setSuggestions([]);
  };

return (
    <>

      <nav
        className="sticky top-0 z-40 border-b py-3 px-2 shadow-sm bg-black text-white"
        style={{ borderColor: BRAND.border }}
      >
        {/* ── Header principal ── */}
        <div
          className="
            relative
            grid
            grid-cols-[auto_1fr_auto]
            lg:grid-cols-3
            items-center
            px-4
            lg:px-6
            py-2
          "
          style={{ color: BRAND.white }}
        > 
          {/* ── Izquierda: botones inicio, productos── */}
          <div className="hidden lg:flex items-center justify-start gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>


          {/* ── Centro: logo */}

          <div className="flex justify-center">
            <button
              className="    lg:hidden
    absolute
    left-4
    top-1/2
    -translate-y-1/2
    p-2
    rounded-xl
    transition-colors
    hover:bg-white/10
    flex
    items-center
    justify-center"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="material-icons-round text-2xl text-white">menu</span>
            </button>

            <a
              href={user ? "/admin" : "/"}
              className="hidden lg:flex items-center leading-none"
            >
              <Image
                src="/logo_mat.png"
                alt= "logo"
                width={190}
                height={60}
                priority
                style={{ height:"65px", width: "auto"}}
              />
            </a>
          </div>

          {/* Logo centrado — solo en móvil/tablet */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center pointer-events-none lg:hidden">
          <a
              href={user ? "/admin" : "/"}
              className="pointer-events-auto flex flex-col items-center leading-none"
            >
              <Image
                src="/logo_mat.png"
                alt="Art Design MAKR"
                width={180}
                height={62}
                priority
                style={{ height: "65px",width: "auto"}}
              />
            </a>
          </div>

          {/* ── Derecha: búsqueda, carrito, usuario ── */}
          <div className="flex justify-end items-center gap-3">
            <div className="relative" ref={searchContainerRef}>
              {!searchOpen ? (
                <button
                  type="button"
                  className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors text-white hover:bg-white/10"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Buscar"
                >
                  <span className="material-icons-round text-2xl">search</span>
                </button>
              ) : (
                <form
                  className="absolute right-0 top-full mt-2 w-[min(75vw,300px)] md:w-[min(92vw,420px)] rounded-2xl border shadow-2xl z-50 overflow-hidden"
                  style={{ background: "#000000", borderColor: "rgba(255,255,255,0.15)" }}
                  onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 border-b"
                    style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <span className="material-icons-round text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar un producto..."
                      className="bg-transparent outline-none text-sm flex-1 text-body"
                      style={{ color: "black", minWidth: 140 }}
                      autoComplete="off"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue("");
                        setSuggestions([]);
                        setSearchOpen(false);
                      }}
                      className="rounded-full p-1 transition-colors hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                      aria-label="Cerrar búsqueda"
                    >
                      <span className="material-icons-round text-base">close</span>
                    </button>
                  </div>

                  {searchValue.trim() && (
                    <div className="max-h-75 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-4 text-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Buscando...
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((prod) => {
                          let href = `/product-detail?id=${prod.id}`;
                          if (isAdmin) href = `/admin/product-detail?id=${prod.id}`;
                          return (
                            <a
                              key={prod.id}
                              href={href}
                              className="flex items-center gap-3 px-4 py-2.5 transition-colors text-sm hover:bg-white/5 text-body"
                              style={{ color: "#ffffff" }}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchValue("");
                              }}
                            >
                              {prod.imagen && (
                                <img
                                  src={prod.imagen}
                                  alt={prod.nombre}
                                  className="w-8 h-8 object-cover rounded-lg shrink-0"
                                />
                              )}
                              <span className="truncate flex-1">{prod.nombre}</span>
                              {prod.marca && (
                                <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  {prod.marca}
                                </span>
                              )}
                            </a>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Sin resultados
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
            <div className="relative flex flex-col items-center">
            <a
                href={user ? "/admin/cart" : "/cart"}
                className="flex items-center justify-center px-1 rounded-xl transition-colors text-white hover:bg-white/10"
                aria-label="Carrito"
                data-onboarding="carrito"
              >
                <span className="material-icons-round text-xl">shopping_cart</span>
                {carrito && carrito.length > 0 && (
                  <span
                    className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 z-10"
                    style={{ background: BRAND.gold, color: "white", borderColor: BRAND.bg }}
                  >
                    {carrito.length}
                  </span>
                )}
              </a>
            </div>

            {user ? (
              <div className="relative">
                <button
                  className="rounded-full transition-opacity hover:opacity-80"
                  onClick={() => setUserMenu(!userMenu)}
                  title="Opciones de usuario"
                  data-onboarding="usuario"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Foto de perfil"
                      className="w-9 h-9 rounded-full object-cover border-2"
                      style={{ borderColor: BRAND.gold }}
                    />
                  ) : (
                    <span className="material-icons-round text-3xl text-white">
                      account_circle
                    </span>
                  )}
                </button>

                {userMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl overflow-hidden z-50"
                    style={{ background: "#000000", borderColor: "rgba(255,255,255,0.15)" }}
                  >
                  <a
                      href="/admin/perfil"
                      className="flex items-center gap-2 px-4 py-3 text-sm transition-colors text-white hover:bg-white/5 text-body"
                    >
                      <span className="material-icons-round text-base">person_outline</span>
                      Perfil
                    </a>
                    <a
                      href="/admin/config"
                      className="flex items-center gap-2 px-4 py-3 text-sm transition-colors text-white hover:bg-white/5 text-body"
                    >
                      <span className="material-icons-round text-base">tune</span>
                      Configuración
                    </a>
                    <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
                    <button
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-red-500 font-medium transition-colors hover:bg-white/5 text-body"
                      onClick={async () => {
                        const { logoutUser } = await import("../lib/firebase-auth");
                        await logoutUser();
                        try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
                        window.location.href = "/";
                      }}
                    >
                      <span className="material-icons-round text-base">logout</span>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      {/* ══════════════════ MOBILE DRAWER ══════════════════ */}
      {mobileOpen && (
        <>
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm mb-12"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 top-0 w-[85vw] max-w-xs max-h-[calc(100vh-80px)] overflow-y-auto shadow-2xl flex flex-col"
            style={{ background: "#000000", color: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header drawer */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: BRAND.border }}
            >
              <span
                className="font-bold text-base"
                style={{ color: "#ffffff", letterSpacing: "0.08em" }}
              >
                Maturin Store
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-xl transition-colors hover:bg-white/10"
                style={{ color: "#ffffff" }}
              >
                <span className="material-icons-round text-xl">close</span>
              </button>
            </div>
 
            <div className="flex-1 px-4 py-4 flex flex-col gap-1">
              {/* Búsqueda móvil */}
              <form
                className="relative flex items-center gap-2 px-3 py-2 rounded-xl border mb-3"
                style={{ background: "rgba(225, 29, 29, 0.08)", borderColor: BRAND.border }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchValue.trim()) {
                    handleSearch();
                    setMobileOpen(false);
                  }
                }}
              >
                <span className="material-icons-round text-lg" style={{ color: "#ffffff" }}>
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar productos..."
                  className="bg-transparent outline-none text-sm flex-1"
                  style={{ color: "black" }}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoComplete="off"
                />
 
                {searchValue.trim() && (
                  <div
                    className="absolute left-0 top-full mt-1 w-full rounded-xl border shadow-xl z-50 overflow-hidden"
                    style={{
                      background: "#000000",
                      borderColor: BRAND.border,
                      maxHeight: 300,
                      overflowY: "auto",
                    }}
                  >
                    {searchLoading ? (
                      <div className="p-4 text-center text-sm" style={{ color: "#ffffff" }}>
                        Buscando...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((prod) => {
                        let href = `/product-detail?id=${prod.id}`;
                        if (isAdmin) href = `/admin/product-detail?id=${prod.id}`;
                        return (
                          <a
                            key={prod.id}
                            href={href}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors text-sm hover:bg-white/5"
                            style={{ color: "#ffffff" }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setMobileOpen(false);
                              setSearchValue("");
                            }}
                          >
                            {prod.imagen && (
                              <img
                                src={prod.imagen}
                                alt={prod.nombre}
                                className="w-8 h-8 object-cover rounded-lg shrink-0"
                              />
                            )}
                            <span className="truncate flex-1">{prod.nombre}</span>
                            {prod.marca && (
                              <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                                {prod.marca}
                              </span>
                            )}
                          </a>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-sm" style={{ color: "#ffffff" }}>
                        Sin resultados
                      </div>
                    )}
                  </div>
                )}
              </form>

              {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                style={{ color: "#ffffff" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}

            {/* Categorías — solo clickeables, sin subcategorías */}
            {categorias.length > 0 && (
              <>
                <div className="border-t my-2" style={{ borderColor: BRAND.border }} />
                <span
                  className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Categorías
                </span>
                {categorias.map((cat) => (
                <a
                    key={cat.id}
                    href={`${basePath}?cat=${cat.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                    style={{ color: "#ffffff" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat.icono && (
                      <span className="material-icons-round" style={{ fontSize: 16, color: BRAND.gold }}>
                        {cat.icono}
                      </span>
                    )}
                    {cat.nombre}
                  </a>
                ))}
              </>
            )}
 
              <div className="border-t my-2" style={{ borderColor: BRAND.border }} />
 
              {user && (
                <>
                  <a
                    href="/admin/perfil"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/10"
                    style={{ color: "#ffffff" }}
                  >
                    <span className="material-icons-round text-base">person</span>
                    Perfil
                  </a>
                  <a
                    href="/admin/config"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/10"
                    style={{ color: "#ffffff" }}
                  >
                    <span className="material-icons-round text-base">settings</span>
                    Configuración
                  </a>
                  <button
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-red-500 font-medium transition-colors hover:bg-white/10"
                    onClick={async () => {
                      const { logoutUser } = await import("../lib/firebase-auth");
                      await logoutUser();
                      try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
                      window.location.href = "/";
                    }}
                  >
                    <span className="material-icons-round text-base">logout</span>
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
};

export default Navbar;