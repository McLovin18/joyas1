"use client";

import { obtenerProductoPorId, obtenerProductosPorCategoria, obtenerProductosPorSubcategoria, obtenerProductosPorSubsubcategoria } from "../../lib/productos-db";
import { Loading3DIcon } from "../../components/Loading3DIcon";
import ProductoCard from "../../components/ProductoCard";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { formatRoundedMeasure, getMeasurePricing } from "../../lib/measure-pricing";

const Markdown = dynamic(() => import("../../components/Markdown"), { ssr: false });
import { ProductReview } from "../../lib/reviews-types";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import { useSearchParams } from "next/navigation";

export default function ProductDetailPage({ params }) {
  const [relacionados, setRelacionados] = useState([]);
  const [producto, setProducto] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"caracteristicas" | "resenas" | null>("caracteristicas");
  const [personalizacionValues, setPersonalizacionValues] = useState<Record<string, string>>({});

  const {
    isLogged, user, isAdmin,
    favoritos, addFavorito, removeFavorito,
    carrito, addCarrito, removeCarrito,
  } = useUser();

  const { showToast } = useToast();

  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchProducto() {
      setLoading(true);
      const id = params?.id || searchParams.get("id");
      if (!id) { setProducto(null); setRelacionados([]); setLoading(false); return; }
      const prod = await obtenerProductoPorId(id);
      setProducto(prod);
      setLoading(false);
      fetchReviews(id);
      if (prod) {
        let rel = [];
        console.log("[RELACIONADOS] subsubcategoria:", prod.subsubcategoria, "subcategoria:", prod.subcategoria, "categoria:", prod.categoria);
        if (prod.subsubcategoria) {
          rel = await obtenerProductosPorSubsubcategoria(prod.subsubcategoria, prod.id, 5);
          console.log("[RELACIONADOS] encontrados por subsubcategoria:", rel);
        }
        if ((!rel || rel.length === 0) && prod.subcategoria) {
          rel = await obtenerProductosPorSubcategoria(prod.subcategoria, prod.id, 5);
          console.log("[RELACIONADOS] encontrados por subcategoria:", rel);
        }
        if ((!rel || rel.length === 0) && prod.categoria) {
          rel = await obtenerProductosPorCategoria(prod.categoria, prod.id, 5);
          console.log("[RELACIONADOS] encontrados por categoria:", rel);
        }
        setRelacionados(rel);
      } else {
        setRelacionados([]);
      }
    }
    fetchProducto();
    // eslint-disable-next-line
  }, [params?.id, searchParams]);

  useEffect(() => {
    if (isLogged && user) {
      setReviewName(user.displayName || "");
      setReviewEmail(user.email || "");
    }
  }, [isLogged, user]);

  async function fetchReviews(productId: string) {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) setReviews(await res.json());
    } catch {}
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError("");
    if (!reviewRating || !reviewText) {
      setReviewError("Completa la calificación y el comentario");
      setReviewLoading(false);
      return;
    }
    if (!isLogged && (!reviewName || !reviewEmail)) {
      setReviewError("Completa nombre y correo para publicar la reseña");
      setReviewLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: producto.id,
          userId: user?.uid || "",
          userName: reviewName || user?.displayName || "Usuario",
          userEmail: reviewEmail,
          rating: reviewRating,
          comment: reviewText,
        }),
      });
      if (res.ok) {
        setReviewText("");
        setReviewRating(0);
        if (!isLogged) { setReviewName(""); setReviewEmail(""); }
        fetchReviews(producto.id);
      } else {
        setReviewError("Error al enviar reseña");
      }
    } catch {
      setReviewError("Error de red");
    }
    setReviewLoading(false);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center mt-2">
        <Loading3DIcon />
        <span className="mt-4 text-slate-400 dark:text-white/30 text-sm">Cargando producto...</span>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0e0520] flex flex-col items-center justify-center mt-2 gap-3">
        <span className="material-icons-round text-5xl text-slate-200 dark:text-white/10">inventory_2</span>
        <p className="text-slate-400 dark:text-white/30 font-medium">Producto no encontrado</p>
      </div>
    );
  }

  // ── Derivados ────────────────────────────────────────────────────────────
  const maxCantidad = producto.stock;
  const isFav = favoritos?.some((p) => p.id === producto.id);
  const customizationFields = Array.isArray((producto as any)?.camposPersonalizacion)
    ? (producto as any).camposPersonalizacion
    : [];
  const priceAffectingField = customizationFields.find((campo: any) => campo?.afectaPrecio);
  const normalizePersonalizacionValues = () =>
    Object.entries(personalizacionValues)
      .filter(([, value]) => String(value || "").trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [key, value]) => {
        acc[key] = String(value).trim();
        return acc;
      }, {} as Record<string, string>);
  const measurePricing = priceAffectingField
    ? getMeasurePricing(
        Number(producto.precio || 0),
        personalizacionValues[priceAffectingField.id] || ""
      )
    : null;
  const basePrice =
    measurePricing?.isValid && measurePricing.adjustedPrice !== null
      ? measurePricing.adjustedPrice
      : Number(producto.precio || 0);
  const discount = Number(producto.descuento || 0);
  const hasDiscount = !isNaN(discount) && discount > 0 && discount < 100;
  const finalPrice = hasDiscount ? Math.round(basePrice * (1 - discount / 100) * 100) / 100 : basePrice;
  const fakeOldPrice = hasDiscount ? basePrice : null;
  const currentCartKey = (() => {
    if (customizationFields.length === 0) return producto.id;

    const allCustomizationCompleted = customizationFields.every(
      (campo: any) => String(personalizacionValues[campo.id] || "").trim() !== ""
    );
    if (!allCustomizationCompleted) return null;
    if (priceAffectingField && measurePricing?.error) return null;

    return `${producto.id}:custom:${encodeURIComponent(
      JSON.stringify(normalizePersonalizacionValues())
    )}`;
  })();
  const inCart = currentCartKey ? carrito?.some((p) => (p.cartKey || p.id) === currentCartKey) : false;

  const avgRating = reviews.length > 0
    ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
    : 0;

  const handleAddCart = () => {
    // Validar campos de personalización si el producto es personalizado
    if ((producto as any)?.personalizado && (producto as any)?.camposPersonalizacion) {
      const camposRequeridos = (producto as any).camposPersonalizacion;
      const camposFaltantes = camposRequeridos.filter((campo: any) => !personalizacionValues[campo.id] || personalizacionValues[campo.id].trim() === "");
      
      if (camposFaltantes.length > 0) {
        showToast("Por favor completa todos los campos de personalización", "error");
        return;
      }
    }

    if (priceAffectingField && measurePricing?.error) {
      showToast(measurePricing.error, "error");
      return;
    }

    if (inCart) {
      removeCarrito(currentCartKey);
      showToast("Eliminado del carrito", "info");
    } else if (currentCartKey) {
      addCarrito({ 
        ...producto, 
        cantidad,
        precioBase: basePrice,
        precioUnitario: finalPrice,
        ...(producto as any)?.personalizado && { personalizacionValues: normalizePersonalizacionValues() },
        cartKey: currentCartKey,
      });
      showToast(`${producto.nombre} añadido al carrito`, "success");
    }
  };
  const handleFav = () => {
    isFav ? removeFavorito(producto.id) : addFavorito(producto);
  };

  const parseDesc = (text: string) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const items: { text: string; sub: string[] }[] = [];
    let current: string | null = null;
    let sub: string[] = [];
    lines.forEach((line) => {
      const l = line.trim();
      if (!l) return;
      if (l.startsWith("»")) {
        if (current !== null) { items.push({ text: current, sub }); sub = []; }
        current = l.replace(/^»+/, "").trim();
      } else if (l.startsWith("–")) {
        sub.push(l.replace(/^–+/, "").trim());
      } else {
        if (sub.length > 0) sub[sub.length - 1] += " " + l;
        else if (current !== null) current += " " + l;
      }
    });
    if (current !== null) items.push({ text: current, sub });
    return items;
  };

  const descItems = parseDesc((producto as any).descripcion || "");
  const rawDescripcion = (producto as any).descripcion || "";

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 transition-colors";

  const reviewsProps = {
    reviews, avgRating, reviewRating, setReviewRating,
    reviewName, setReviewName, reviewEmail, setReviewEmail,
    reviewText, setReviewText, reviewError, reviewLoading,
    handleSubmitReview, isLogged, inputCls,
  };

  const hasCaracteristicas = producto.caracteristicas?.length > 0;

  const handleTabToggle = (tab: "caracteristicas" | "resenas") => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <div className="min-h-screen flex flex-col mt-2 bg-white dark:bg-black text-slate-900 dark:text-white transition-colors">

      <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-14">

          {/* ══ GALERÍA + TABS ══════════════════════════════════════ */}
          <div className="w-full md:w-[44%] flex flex-col gap-3">

            {/* Imagen principal */}
            <div className="relative aspect-square rounded-2xl overflow-hidden dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              {hasDiscount && (
                <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{discount}%
                </span>
              )}
              <img
                src={producto.imagenes[imgIdx]}
                alt={producto.nombre}
                className="w-full h-full object-contain p-5"
              />
              {producto.imagenes.length > 1 && imgIdx > 0 && (
                <button
                  onClick={() => setImgIdx(imgIdx - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <span className="material-icons-round text-slate-600 dark:text-white/70 text-lg">chevron_left</span>
                </button>
              )}
              {producto.imagenes.length > 1 && imgIdx < producto.imagenes.length - 1 && (
                <button
                  onClick={() => setImgIdx(imgIdx + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <span className="material-icons-round text-slate-600 dark:text-white/70 text-lg">chevron_right</span>
                </button>
              )}
            </div>

            {/* Miniaturas */}
            {producto.imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {producto.imagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImgIdx(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all bg-slate-50 dark:bg-white/5 ${
                      imgIdx === idx
                        ? "border-slate-400 dark:border-white/30 scale-105"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}

            {/* ── TABS: Características / Reseñas — solo desktop ───── */}
            <div className="hidden md:flex mt-1 flex-col gap-0 py-16">
              {/* Botones tab */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
                {hasCaracteristicas && (
                  <button
                    onClick={() => handleTabToggle("caracteristicas")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === "caracteristicas"
                        ? "bg-black text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-icons-round text-[16px]">list_alt</span>
                    Características
                  </button>
                )}
                <button
                  onClick={() => handleTabToggle("resenas")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                    hasCaracteristicas ? "border-l border-slate-200 dark:border-white/[0.08]" : ""
                  } ${
                    activeTab === "resenas"
                      ? "bg-black text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="material-icons-round text-[16px]">star_outline</span>
                  Reseñas
                  {reviews.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === "resenas"
                        ? "bg-white text-black"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {reviews.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Panel de contenido del tab activo */}
              {activeTab && (
                <div className="border border-t-0 border-slate-200 dark:border-white/[0.08] rounded-b-xl px-4 py-4 bg-slate-50 dark:bg-white/[0.02]">

                  {/* Panel: Características */}
                  {activeTab === "caracteristicas" && hasCaracteristicas && (
                    <ul className="space-y-2">
                      {producto.caracteristicas.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-black/80 dark:text-white/80">
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20 mt-2 flex-shrink-0" />
                          <Markdown>{c}</Markdown>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Panel: Reseñas */}
                  {activeTab === "resenas" && (
                    <ReviewsSection {...reviewsProps} />
                  )}

                </div>
              )}
            </div>
            {/* ── FIN TABS ─────────────────────────────────────────── */}

          </div>

          {/* ══ INFO ════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Nombre + SKU */}
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold leading-tight text-slate-800 dark:text-white break-words max-w-full whitespace-pre-line"
                style={{ wordBreak: "break-word", maxWidth: "100%" }}
                title={producto.nombre}
              >
                {producto.nombre}
              </h1>
              <p className="text-xs text-slate-400 dark:text-white/20 mt-1.5">
                SKU: {producto.sku || producto.id}
              </p>
            </div>

            {/* Rating inline */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-base ${i < Math.round(avgRating) ? "text-yellow-400" : "text-slate-200 dark:text-white/10"}`}>★</span>
                ))}
                <span className="text-xs text-slate-400 dark:text-white/25 ml-1">
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
              </div>
            )}

            <div className="flex items-baseline gap-3 flex-wrap">
              {hasDiscount && (
                <span className="text-sm text-slate-400 dark:text-white/20 line-through">
                  ${fakeOldPrice?.toFixed(2)}
                </span>
              )}
              <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
                ${finalPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-400/10 px-2 py-0.5 rounded-full">
                  {discount}% OFF
                </span>
              )}
            </div>

            {priceAffectingField && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {!personalizacionValues[priceAffectingField.id]?.trim() && (
                  <p>El precio base corresponde a la medida estandar de 150x100 cm. Escribe una medida como 150x100 cm para recalcular.</p>
                )}
                {measurePricing?.error && (
                  <p className="text-red-600">{measurePricing.error}</p>
                )}
                {measurePricing?.isValid && (
                  <p className="text-emerald-700">
                    Precio calculado con {formatRoundedMeasure(measurePricing)}
                    {(measurePricing.rawWidthCm !== measurePricing.roundedWidthCm ||
                      measurePricing.rawHeightCm !== measurePricing.roundedHeightCm) && (
                      <> tras redondear desde {measurePricing.rawWidthCm}x{measurePricing.rawHeightCm} cm.</>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="h-px bg-slate-100 dark:bg-white/[0.06]" />

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-white/30 font-medium">Disponibilidad:</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                producto.stock > 0
                  ? "bg-green-50 dark:bg-green-400/10 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-400"
              }`}>
                {producto.stock > 0 ? `${producto.stock} en stock` : "Sin stock"}
              </span>
            </div>

            {/* Campos de personalización */}
            {(producto as any)?.personalizado && (producto as any)?.camposPersonalizacion && (producto as any).camposPersonalizacion.length > 0 && (
              <div className="mt-4 rounded-xl border p-4 bg-amber-50 border-amber-200">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-900">
                  <span className="material-icons-round text-base">auto_awesome</span>
                  Personalización
                </h3>
                <div className="space-y-3">
                  {(producto as any).camposPersonalizacion.map((campo: any) => (
                    <div key={campo.id}>
                      <label className="block text-xs font-medium mb-1 text-amber-800">
                        {campo.nombre}
                      </label>
                      {campo.afectaPrecio ? (
                        <>
                          <input
                            type="text"
                            value={personalizacionValues[campo.id] || ""}
                            onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                            placeholder="150x100 cm"
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${
                              measurePricing?.error ? "border-red-400 ring-2 ring-red-200" : "border-amber-300 focus:ring-2 focus:ring-amber-200"
                            }`}
                          />
                          <p className={`mt-1.5 text-xs ${measurePricing?.error ? "text-red-600" : "text-amber-700"}`}>
                            {measurePricing?.error || "Formato requerido: ancho x alto. Ejemplo: 150x100 cm."}
                          </p>
                        </>
                      ) : campo.tipo === "texto" ? (
                        <input
                          type="text"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          placeholder={`Ingresa ${campo.nombre.toLowerCase()}`}
                          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                        />
                      ) : campo.tipo === "numero" ? (
                        <input
                          type="number"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          placeholder={`Ingresa ${campo.nombre.toLowerCase()}`}
                          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                        />
                      ) : campo.tipo === "fecha" ? (
                        <input
                          type="date"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cantidad */}
            {producto.stock > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-white/30 font-medium">Cantidad:</span>
                <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setCantidad((v) => Math.max(1, v - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-white dark:hover:bg-white/10 font-bold text-lg transition-colors"
                  >−</button>
                  <span className="w-9 text-center text-sm font-semibold text-slate-800 dark:text-white">
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad((v) => Math.min(maxCantidad, v + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-white/60 hover:bg-white dark:hover:bg-white/10 font-bold text-lg transition-colors"
                  >+</button>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={handleAddCart}
                disabled={producto.stock === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                  producto.stock === 0
                    ? "bg-white text-slate-300 border-slate-200 cursor-not-allowed opacity-50 shadow-none"
                    : inCart
                      ? "bg-white text-black border-black/40 hover:border-black/60 hover:shadow-md"
                      : "bg-white text-slate-900 border-black/30 hover:border-black hover:shadow-md"
                }`}
              >
                <span className="material-icons-round text-[18px]">
                  {inCart ? "remove_shopping_cart" : "add_shopping_cart"}
                </span>
                {inCart ? "Quitar del carrito" : "Añadir al carrito"}
              </button>

              {isLogged && (
                <button
                  onClick={handleFav}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isFav
                      ? "bg-red-500 text-white shadow"
                      : "bg-white border border-slate-300 text-slate-500 hover:border-black/40 hover:text-black hover:shadow-sm"
                  }`}
                  title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <span className="material-icons-round text-xl">
                    {isFav ? "favorite" : "favorite_border"}
                  </span>
                </button>
              )}
            </div>

            {/* Descripción debajo de Añadir al carrito */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">Descripción del producto</h2>
              {rawDescripcion.trim() ? (
                descItems.length > 0 && (descItems.length > 1 || descItems[0].sub.length > 0 || descItems[0].text !== rawDescripcion.trim()) ? (
                  <ul className="space-y-2">
                    {descItems.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-black/80 dark:text-white/80 leading-relaxed">
                        <span className="text-slate-300 dark:text-white/20 flex-shrink-0 mt-0.5">›</span>
                        <span>
                          {item.text}
                          {item.sub.length > 0 && (
                            <ul className="mt-1 space-y-0.5 ml-3">
                              {item.sub.map((s, j) => (
                                <li key={j} className="flex gap-1.5 text-slate-400 dark:text-white/35">
                                  <span className="flex-shrink-0">–</span>{s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-line">{rawDescripcion}</p>
                )
              ) : (
                <p className="text-sm text-slate-400 dark:text-white/40">Sin descripción</p>
              )}
            </div>

            {/* Descripción */}
            {descItems.length > 0 && (
              <ul className="space-y-2">
                <h1 className="text-black bg-text-white">Descripción:</h1>
                {descItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-black/80 dark:text-white/80 leading-relaxed">
                    <span className="text-slate-300 dark:text-white/20 flex-shrink-0 mt-0.5">›</span>
                    <span>
                      {item.text}
                      {item.sub.length > 0 && (
                        <ul className="mt-1 space-y-0.5 ml-3">
                          {item.sub.map((s, j) => (
                            <li key={j} className="flex gap-1.5 text-slate-400 dark:text-white/35">
                              <span className="flex-shrink-0">–</span>{s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Banner login */}
            {!isLogged && (
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/25 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] rounded-xl px-3 py-2.5">
                <span className="material-icons-round text-sm flex-shrink-0">info</span>
                <span>
                  Mejor experiencia al{" "}
                  <a href="/login?tab=register" className="underline underline-offset-2 text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 transition-colors">
                    iniciar sesión
                  </a>
                </span>
              </div>
            )}

          </div>

        </div>
      </div>

        {/* ── TABS móvil: debajo de info, encima de relacionados ── */}
        <div className="md:hidden mt-4 flex flex-col gap-0 py-9">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
            {hasCaracteristicas && (
              <button
                onClick={() => handleTabToggle("caracteristicas")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "caracteristicas"
                    ? "bg-black text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="material-icons-round text-[16px]">list_alt</span>
                Características
              </button>
            )}
            <button
              onClick={() => handleTabToggle("resenas")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                hasCaracteristicas ? "border-l border-slate-200 dark:border-white/[0.08]" : ""
              } ${
                activeTab === "resenas"
                  ? "bg-black text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-icons-round text-[16px]">star_outline</span>
              Reseñas
              {reviews.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "resenas"
                    ? "bg-[#7b68ee] dark:bg-slate-900/20"
                    : "bg-slate-100 dark:bg-[#7b68ee] text-slate-600 dark:text-white/50"
                }`}>
                  {reviews.length}
                </span>
              )}
            </button>
          </div>

          {activeTab && (
            <div className="border border-t-0 border-slate-200 dark:border-white/[0.08] rounded-b-xl px-4 py-4 bg-slate-50 dark:bg-white/[0.02]">
              {activeTab === "caracteristicas" && hasCaracteristicas && (
                <ul className="space-y-2">
                  {producto.caracteristicas.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-black/80 dark:text-white/80">
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20 mt-2 flex-shrink-0" />
                      <Markdown>{c}</Markdown>
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === "resenas" && (
                <ReviewsSection {...reviewsProps} />
              )}
            </div>
          )}
        </div>
        {/* ── FIN TABS móvil ───────────────────────────────────── */}

      {/* Productos relacionados */}
      <div className="max-w-7xl mx-auto w-full px-1 sm:px-3 pb-10">
        <h2 className="text-xl font-bold mb-4 mt-10 text-slate-800 dark:text-white">Productos relacionados</h2>
        {relacionados && relacionados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {relacionados.map((prod) => (
              <ProductoCard key={prod.id} producto={prod} />
            ))}
          </div>
        ) : (
          <div className="text-slate-400 dark:text-white/30 text-center py-8">No hay productos relacionados para mostrar.</div>
        )}
      </div>
    </div>
  );
}

// ── Componente de reseñas ─────────────────────────────────────────────────────
function ReviewsSection({
  reviews, avgRating,
  reviewRating, setReviewRating,
  reviewName, setReviewName,
  reviewEmail, setReviewEmail,
  reviewText, setReviewText,
  reviewError, reviewLoading,
  handleSubmitReview, isLogged, inputCls,
}: any) {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      {reviews.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold text-slate-800 dark:text-white leading-none">
            {avgRating.toFixed(1)}
          </span>
          <div>
            <div className="flex gap-0.5 mb-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-lg ${i < Math.round(avgRating) ? "text-yellow-400" : "text-slate-200 dark:text-white/10"}`}>★</span>
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-white/25">
              {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-black/80 dark:text-white/80">Sé el primero en dejar una reseña.</p>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <ul className="space-y-4">
          {reviews.map((r: any) => (
            <li key={r.id} className="pb-4 border-b border-slate-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-sm font-semibold text-slate-700 dark:text-white/75">{r.userName}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-sm ${i < r.rating ? "text-yellow-400" : "text-slate-200 dark:text-white/10"}`}>★</span>
                  ))}
                </div>
                <span className="text-xs text-slate-300 dark:text-white/20 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-white/45 leading-relaxed">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmitReview} className="pt-2 space-y-4">
        <p className="text-sm font-medium text-black/80 dark:text-white/80">Escribe una reseña</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-black/75 dark:text-white/80">Nombre</label>
            <input className={inputCls} placeholder="Tu nombre" value={reviewName}
              onChange={(e) => setReviewName(e.target.value)} required={!isLogged} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-black/75 dark:text-white/80">Correo</label>
            <input className={inputCls} placeholder="tu@correo.com" type="email" value={reviewEmail}
              onChange={(e) => setReviewEmail(e.target.value)} required={!isLogged} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-black/80 dark:text-white/80">Calificación</label>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} onClick={() => setReviewRating(i + 1)} role="button"
                aria-label={`Calificación ${i + 1}`}
                className={`text-2xl cursor-pointer transition-transform hover:scale-110 select-none ${
                  i < reviewRating ? "text-yellow-400" : "text-slate-200 dark:text-white/10"
                }`}>★</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-black/80 dark:text-white/80">Comentario</label>
          <textarea className={`${inputCls} resize-none`} rows={3}
            placeholder="Cuéntanos tu experiencia..." value={reviewText}
            onChange={(e) => setReviewText(e.target.value)} required />
        </div>

        {reviewError && (
          <p className="text-xs text-red-500 dark:text-red-400">{reviewError}</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <button type="submit" disabled={reviewLoading}
            className="px-6 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-bold hover:border-black/60 hover:text-black hover:shadow-sm disabled:opacity-40 transition-all">
            {reviewLoading ? "Enviando..." : "Publicar reseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
