"use client";

import { obtenerProductoPorId, obtenerProductosPorCategoria, obtenerProductosPorSubcategoria, obtenerProductosPorSubsubcategoria } from "../lib/productos-db";
import { obtenerAtributos } from "../lib/atributos-db";
import { Loading3DIcon } from "../components/Loading3DIcon";
import VariationsManager from "../components/VariationsManager";
import React, { useState, useEffect } from "react";
import { ProductReview } from "../lib/reviews-types";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { useSearchParams } from "next/navigation";
import BottomBarPublic from "../components/BottomBarPublic";
import dynamic from "next/dynamic";
import { getCartItemKey } from "../context/userLocalStorage";
import { getCatalogPricing } from "../lib/pricing";
import { formatRoundedMeasure, getMeasurePricing } from "../lib/measure-pricing";
import { useSiteSettings } from "../context/SiteSettingsContext";
import WatermarkedImage from "../components/WaterMarketImage";

const Markdown = dynamic(() => import("../components/Markdown"), { ssr: false });

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
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const variationStorageKey = `product_variations_${producto?.id}`;
  const [currentStock, setCurrentStock] = useState(0);
  const [atributos, setAtributos] = useState<Record<string, string>>({}); // Mapeo de ID -> nombre
  const [personalizacionValues, setPersonalizacionValues] = useState<Record<string, string>>({});
  const [altoRelieve, setAltoRelieve] = useState(false);
  const { settings } = useSiteSettings();

  const {
    isLogged, user, isAdmin,
    favoritos, addFavorito, removeFavorito,
    carrito, addCarrito, removeCarrito,
  } = useUser();

  const { showToast } = useToast();

  const searchParams = useSearchParams();

  // Cargar atributos disponibles
  useEffect(() => {
    obtenerAtributos()
      .then((attrs) => {
        const mapping: Record<string, string> = {};
        attrs.forEach((attr: any) => {
          mapping[attr.id] = attr.nombre;
        });
        setAtributos(mapping);
      })
      .catch((err) => console.error("Error cargando atributos:", err));
  }, []);



  useEffect(() => {
    if (!producto?.id) return;

    try {
      const saved = localStorage.getItem(variationStorageKey);

      if (saved) {
        const parsed = JSON.parse(saved);

        setSelectedVariations(parsed);
      }
    } catch (err) {
      console.error("Error cargando variaciones guardadas:", err);
    }
  }, [producto?.id]);



  useEffect(() => {
  if (!producto?.id) return;

  try {
    localStorage.setItem(
      variationStorageKey,
      JSON.stringify(selectedVariations)
    );
  } catch (err) {
    console.error("Error guardando variaciones:", err);
  }
}, [selectedVariations, producto?.id]);



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
          rel = await obtenerProductosPorSubsubcategoria(prod.subsubcategoria, prod.id, 10);
          console.log("[RELACIONADOS] encontrados por subsubcategoria:", rel);
        }
        if ((!rel || rel.length === 0) && prod.subcategoria) {
          rel = await obtenerProductosPorSubcategoria(prod.subcategoria, prod.id, 10);
          console.log("[RELACIONADOS] encontrados por subcategoria:", rel);
        }
        if ((!rel || rel.length === 0) && prod.categoria) {
          rel = await obtenerProductosPorCategoria(prod.categoria, prod.id, 10);
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
      const res = await fetch(`/api/reviews?productId=${productId}`, { cache: 'no-store' });
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
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center mt-2">
        <Loading3DIcon />
        <span className="mt-4 text-slate-400 dark:text-white/30 text-sm">Cargando producto...</span>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center mt-2 gap-3">
        <span className="material-icons-round text-5xl text-slate-200 dark:text-white/10">inventory_2</span>
        <p className="text-slate-400 dark:text-white/30 font-medium">Producto no encontrado</p>
      </div>
    );
  }

  // ── Derivados ────────────────────────────────────────────────────────────
  const hasVariations = producto?.hasVariations || producto?.isCamiseta || false;
  const variationAttributeIds = producto?.variationAttributeIds || [];
  const stockVariants = producto?.stockVariants || [];
  const customizationFields = Array.isArray((producto as any)?.camposPersonalizacion)
    ? (producto as any).camposPersonalizacion
    : [];
  const priceAffectingField = customizationFields.find((campo: any) => campo?.afectaPrecio);
  
  // Calcular maxCantidad basado en currentStock (que es actualizado por VariationsManager)
  const maxCantidad = hasVariations ? currentStock : (producto?.stock || 0);
  
  const isFav = favoritos?.some((p) => p.id === producto?.id);
  
  // Generar cartKey basado en variaciones seleccionadas
  const normalizePersonalizacionValues = () =>
    Object.entries(personalizacionValues)
      .filter(([, value]) => String(value || "").trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [key, value]) => {
        acc[key] = String(value).trim();
        return acc;
      }, {} as Record<string, string>);

  const generateCartKey = () => {
    let baseCartKey = producto.id;

    if (hasVariations && variationAttributeIds.length > 0) {
      // Verificar que todas las variaciones estén seleccionadas
      const allSelected = variationAttributeIds.every(attrId => selectedVariations[attrId]);
      if (!allSelected) return null;

      // Generar key con valores de variaciones
      const values = variationAttributeIds.map(attrId => selectedVariations[attrId]).join(":");
      baseCartKey = `${producto.id}:${values}`;
    }
    
    if (altoRelieve && priceAffectingField && measurePricing?.isValid && !measurePricing?.error) {
      baseCartKey = `${baseCartKey}:alto-relieve`;
    }

    if (customizationFields.length === 0) return baseCartKey;

    const allCustomizationCompleted = customizationFields.every(
      (campo: any) => String(personalizacionValues[campo.id] || "").trim() !== ""
    );
    if (!allCustomizationCompleted) return null;
    if (priceAffectingField && measurePricing.error) return null;

    const personalizationKey = encodeURIComponent(
      JSON.stringify(normalizePersonalizacionValues())
    );

    return `${baseCartKey}:custom:${personalizationKey}`;
  };
  
  // Detectar si es un producto de ensambles (subcategoría 1775935523162)
  const isEnsamblesProduct = producto.subcategoria === "1775935523162";
  // Categoría que solo sirve para mostrar trabajos realizados
  const VISUAL_ONLY_CATEGORY_ID = "1785564342207";

  const isVisualOnlyProduct =
  producto.categoria === VISUAL_ONLY_CATEGORY_ID;
  const imageContainerWidthClass = isEnsamblesProduct ? "md:w-[60%]" : "md:w-[44%]";

  // Obtener precio base - soportar variaciones dinámicas
  const variantBasePrice = (() => {
    if (!hasVariations) return Number(producto.precio || 0);
    
    if (variationAttributeIds.length === 0) return Number(producto.precio || 0);
    
    // Verificar que todas las variaciones estén seleccionadas
    const allSelected = variationAttributeIds.every(attrId => selectedVariations[attrId]);
    if (!allSelected) return Number(producto.precio || 0);
    
    // Encontrar variante que coincida
    const matchingVariant = stockVariants.find((variant) => {
      const attrs = variant.attributes || {};
      return variationAttributeIds.every(
        (attrId) => attrs[attrId] === selectedVariations[attrId]
      );
    });
    
    return matchingVariant?.precio ?? Number(producto.precio || 0);
  })();

  const measurePricing = priceAffectingField
    ? getMeasurePricing(
        variantBasePrice,
        personalizacionValues[priceAffectingField.id] || ""
      )
    : null;
  const effectiveBasePrice =
    measurePricing?.isValid && measurePricing.adjustedPrice !== null
      ? measurePricing.adjustedPrice
      : variantBasePrice;
  const shouldApplyAltoRelieve =
    altoRelieve && !!priceAffectingField && !!measurePricing?.isValid && !measurePricing?.error;
  const effectiveBasePriceWithAltoRelieve = shouldApplyAltoRelieve
    ? Math.round(effectiveBasePrice * 1.15 * 100) / 100
    : effectiveBasePrice;
  const currentCartKey = generateCartKey();
  const inCart = currentCartKey ? carrito?.some((p) => getCartItemKey(p) === currentCartKey) : false;
  
  const { discount, hasDiscount, fakeOldPrice, finalPrice } = getCatalogPricing({
    ...producto,
    precioBase: effectiveBasePriceWithAltoRelieve,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
    : 0;

  const handleAddCart = () => {
    // Validar variaciones si el producto las tiene
    if (hasVariations && variationAttributeIds.length > 0) {
      const allSelected = variationAttributeIds.every(attrId => selectedVariations[attrId]);
      if (!allSelected) {
        showToast("Por favor selecciona todas las opciones", "error");
        return;
      }
    }

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

    if (inCart && currentCartKey) {
      removeCarrito(currentCartKey);
      showToast("Eliminado del carrito", "info");
    } else if (currentCartKey) {
      const cartItem = {
        ...producto,
        cantidad,
        precioBase: effectiveBasePriceWithAltoRelieve,
        precioUnitario: finalPrice,
        stock: maxCantidad,
        ...(hasVariations && { selectedVariations, variationAttributeIds }),
        ...(producto as any)?.personalizado && { personalizacionValues: normalizePersonalizacionValues() },
        ...(shouldApplyAltoRelieve && { altoRelieve: true }),
        cartKey: currentCartKey,
      };
      addCarrito(cartItem);
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


const movePriceBelowCart =
  ((personalizacionValues[priceAffectingField?.id] || "").trim() !== "") ||
  altoRelieve;


return (
    <div className="min-h-screen flex flex-col mt- text-white transition-colors">
      <BottomBarPublic/>

      <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-14">

          {/* ══ GALERÍA + TABS ══════════════════════════════════════ */}
          <div
            className={`w-full ${imageContainerWidthClass} flex flex-col gap-3 ${
              isVisualOnlyProduct ? "mx-auto" : ""
            }`}
          >
            
          {/* Imagen principal */}
          <div className="relative aspect-square rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10">
            {hasDiscount && (
              <span className="absolute top-3 left-3 z-10 bg-[#7B9BC0] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                -{discount}%
              </span>
            )}

            <WatermarkedImage
              src={producto.imagenes[imgIdx]}
              watermarkSrc={
                Boolean(producto.imagenesWatermark?.[imgIdx]) ? settings.productWatermarkUrl : null
              }
              alt={producto.nombre}
              imgClassName="w-full h-full object-contain p-5"
              watermarkRatio={0.18}
            />

            {producto.imagenes.length > 1 && imgIdx > 0 && (
              <button
                onClick={() => setImgIdx(imgIdx - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#141313] border border-white/15 shadow flex items-center justify-center hover:scale-105 hover:border-[#7B9BC0] transition-all"
              >
                <span className="material-icons-round text-white/70 text-lg">chevron_left</span>
              </button>
            )}
            {producto.imagenes.length > 1 && imgIdx < producto.imagenes.length - 1 && (
              <button
                onClick={() => setImgIdx(imgIdx + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#141313] border border-white/15 shadow flex items-center justify-center hover:scale-105 hover:border-[#7B9BC0] transition-all"
              >
                <span className="material-icons-round text-white/70 text-lg">chevron_right</span>
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
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all bg-black/30 backdrop-blur-sm ${
                      imgIdx === idx
                        ? "border-[#7B9BC0] scale-105"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}

            {/* ── TABS: Características / Reseñas — solo desktop ───── */}

          {!isVisualOnlyProduct && (
            <div className="hidden md:flex mt-1 flex-col gap-0 py-18">
              {/* Botones tab */}
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {hasCaracteristicas && (
                  <button
                    onClick={() => handleTabToggle("caracteristicas")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === "caracteristicas"
                            ? "bg-[#7B9BC0] text-white"
                            : ": bg-black/30 backdrop-blur-sm text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="material-icons-round text-[16px]">list_alt</span>
                    Características
                  </button>
                )}
                <button
                  onClick={() => handleTabToggle("resenas")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                    hasCaracteristicas ? "border-l border-white/10" : ""
                  } ${
                    activeTab === "resenas"
                            ? "bg-[#7B9BC0] text-white"
                            : "bg-black/30 backdrop-blur-sm text-white hover:bg-white/10"
                  }`}
                >
                  <span className="material-icons-round text-[16px]">star_outline</span>
                  Reseñas
                  {reviews.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === "resenas"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white"
                    }`}>
                      {reviews.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Panel de contenido del tab activo */}
              {activeTab && (
                <div className="border border-t-0 border-white/10 rounded-b-xl px-4 py-4 bg-black/30 backdrop-blur-sm">

                  {/* Panel: Características */}
                  {activeTab === "caracteristicas" && hasCaracteristicas && (
                    <ul className="space-y-2">
                      {producto.caracteristicas.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-white/80">
                          <span className="w-1 h-1 rounded-full bg-[#7B9BC0] mt-2 flex-shrink-0" />
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
          )}
          </div>


          {/* ══ INFO ════════════════════════════════════════════════ */}
        {!isVisualOnlyProduct && (
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Nombre + SKU */}
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold leading-tight text-white break-words max-w-full whitespace-pre-line"
                style={{ wordBreak: "break-word", maxWidth: "100%" }}
                title={producto.nombre}
              >
                {producto.nombre}
              </h1>
              <p className="text-xs text-white/30 mt-1.5">
                SKU: {producto.sku || producto.id}
              </p>
            </div>

            {/* Rating inline */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-base ${i < Math.round(avgRating) ? "text-[#7B9BC0]" : "text-white/10"}`}>★</span>
                ))}
                <span className="text-xs text-white/40 ml-1">
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
              </div>
            )}


            {!movePriceBelowCart && (
              <div className="flex items-baseline gap-3 flex-wrap">
                {hasDiscount && (
                  <span className="text-sm text-white/30 line-through">
                    ${(fakeOldPrice * cantidad).toFixed(2)}
                  </span>
                )}

                <span className="text-3xl font-extrabold text-white">
                  ${(finalPrice * cantidad).toFixed(2)}
                </span>

                {hasDiscount && (
                  <span className="text-xs font-semibold text-[#7B9BC0] bg-red-500/10 px-2 py-0.5 rounded-full">
                    {discount}% OFF
                  </span>
                )}

              </div>
            )}

            {priceAffectingField && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65">
                {!personalizacionValues[priceAffectingField.id]?.trim() && (
                  <p>El precio base corresponde a la medida estandar de 150x100 cm. Escribe una medida como 150x100 cm para recalcular.</p>
                )}
                {measurePricing?.error && (
                  <p className="text-[#7B9BC0]">{measurePricing.error}</p>
                )}
                {measurePricing?.isValid && (
                  <p className="text-emerald-400">
                    Precio calculado con {formatRoundedMeasure(measurePricing)}
                    {(measurePricing.rawWidthCm !== measurePricing.roundedWidthCm ||
                      measurePricing.rawHeightCm !== measurePricing.roundedHeightCm) && (
                      <> tras redondear desde {measurePricing.rawWidthCm}x{measurePricing.rawHeightCm} cm.</>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="h-px bg-white/10" />


            
            {/* Selectors de variaciones */}
            {hasVariations && variationAttributeIds.length > 0 && (
              <VariationsManager
                stockVariants={stockVariants}
                variationAttributeIds={variationAttributeIds}
                attributeNames={atributos}
                selectedVariations={selectedVariations}
                onVariationChange={(attrId, value) => {
                  setSelectedVariations(prev => {
                    const updated = {
                      ...prev,
                      [attrId]: value
                    };

                    return updated;
                  });

                  setCantidad(1);
                }}
                onStockChange={setCurrentStock}
              />
            )}

{/* Campos de personalización */}
            {(producto as any)?.personalizado && (producto as any)?.camposPersonalizacion && (producto as any).camposPersonalizacion.length > 0 && (
              <div
                className="mt-6 rounded-2xl p-4"
                style={{
                  background: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
                  boxShadow: `
                    0 0 0 3px #000000,
                    0 0 0 6px rgba(255,255,255,0.22),
                    inset 0 8px 30px rgba(255,255,255,0.08),
                    inset 0 -20px 30px -10px rgba(0,0,0,0.5),
                    0 16px 36px rgba(0,0,0,0.65),
                    0 4px 10px rgba(0,0,0,0.5)
                  `,
                }}
              >
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[#7B9BC0]">
                  <span className="material-icons-round text-base">auto_awesome</span>
                  Personalización
                </h3>
                <div className="space-y-3">
                  {(producto as any).camposPersonalizacion.map((campo: any) => (
                    <div key={campo.id}>
                      <label className="block text-xs font-bold mb-1.5 text-white">
                        {campo.nombre}
                        {campo.ejemplo && (
                          <span className="text-white font-bold"> (Ej. {campo.ejemplo})</span>
                        )}
                      </label>
                      {campo.afectaPrecio ? (
                        <>
                          <input
                            type="text"
                            value={personalizacionValues[campo.id] || ""}
                            onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                            placeholder="150x100 cm"
                            className={`w-full rounded-xl border-none px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-amber-300 bg-white text-black placeholder:text-black/45 ${
                              measurePricing?.error ? "ring-2 ring-[#7B9BC0]" : ""
                            }`}
                          />
                          <p className={`mt-1.5 text-xs ${measurePricing?.error ? "text-[#7B9BC0]" : "text-white/55"}`}>
                            {measurePricing?.error || "Formato requerido: ancho x alto. Ejemplo: 150x100 cm."}
                          </p>
                        </>
                      ) : campo.tipo === "texto" ? (
                        <input
                          type="text"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          placeholder={`Ingresa ${campo.nombre.toLowerCase()}`}
                          className="w-full rounded-xl border-none px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#7B9BC0] bg-white text-black placeholder:text-black/45"
                        />
                      ) : campo.tipo === "numero" ? (
                        <input
                          type="number"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          placeholder={`Ingresa ${campo.nombre.toLowerCase()}`}
                          className="w-full rounded-xl border-none px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#7B9BC0] bg-white text-black placeholder:text-black/45"
                        />
                      ) : campo.tipo === "fecha" ? (
                        <input
                          type="date"
                          value={personalizacionValues[campo.id] || ""}
                          onChange={(e) => setPersonalizacionValues(prev => ({ ...prev, [campo.id]: e.target.value }))}
                          className="w-full rounded-xl border-none px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-amber-300 bg-white text-black"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Cantidad */}
            {maxCantidad > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-white/40 font-medium">Cantidad:</span>
                <div className="flex items-center bg-[#0a0a0a] rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setCantidad((v) => Math.max(1, v - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 font-bold text-lg transition-colors"
                  >−</button>
                  <span className="w-9 text-center text-sm font-semibold text-white">
                    {cantidad}
                  </span>
                  <button
                    onClick={() => setCantidad((v) => Math.min(maxCantidad, v + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 font-bold text-lg transition-colors"
                  >+</button>
                </div>
                {priceAffectingField && measurePricing?.isValid && !measurePricing?.error && (
                  <label className="flex items-center gap-2 text-xl text-white/70 select-none">
                    <input
                      type="checkbox"
                      checked={altoRelieve}
                      onChange={(e) => setAltoRelieve(e.target.checked)}
                      className="w-4 h-4 accent-[#7B9BC0]"
                    />
                    desea agregar alto relieve al cuadro?
                  </label>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={handleAddCart}
                disabled={maxCantidad === 0 || (hasVariations && variationAttributeIds.length > 0 && !variationAttributeIds.every(attrId => selectedVariations[attrId]))}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                  maxCantidad === 0 || (hasVariations && variationAttributeIds.length > 0 && !variationAttributeIds.every(attrId => selectedVariations[attrId]))
                    ? "bg-black text-white/20 border-white/10 cursor-not-allowed opacity-50 shadow-none"
                    : inCart
                      ? "bg-[#7B9BC0] text-white border-[#7B9BC0] hover:bg-[#7B9BC0] hover:shadow-md"
                      : "bg-[#7B9BC0] text-white border-[#7B9BC0] hover:bg-[#7B9BC0] hover:shadow-md"
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
                      ? "bg-[#7B9BC0] text-white shadow"
                      : "bg-black border border-white/15 text-white hover:border-[#7B9BC0] hover:text-[#7B9BC0] hover:shadow-sm"
                  }`}
                  title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <span className="material-icons-round text-xl">
                    {isFav ? "favorite" : "favorite_border"}
                  </span>
                </button>
              )}
            </div>

            {movePriceBelowCart && (
              <div className="flex items-baseline gap-3 flex-wrap mt-2">
                {hasDiscount && (
                  <span className="text-sm text-white/30 line-through">
                    ${(fakeOldPrice * cantidad).toFixed(2)}
                  </span>
                )}

                <span className="text-3xl font-extrabold text-white">
                  ${(finalPrice * cantidad).toFixed(2)}
                </span>

                {hasDiscount && (
                  <span className="text-xs font-semibold text-[#7B9BC0] bg-red-500/10 px-2 py-0.5 rounded-full">
                    {discount}% OFF
                  </span>
                )}

              </div>
            )}
            {/* Descripción debajo de Añadir al carrito */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-white">Descripción del producto</h2>
              {rawDescripcion.trim() ? (
                descItems.length > 0 && (descItems.length > 1 || descItems[0].sub.length > 0 || descItems[0].text !== rawDescripcion.trim()) ? (
                  <ul className="space-y-2">
                    {descItems.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-white/80 leading-relaxed">
                        <span className="text-[#7B9BC0] flex-shrink-0 mt-0.5">›</span>
                        <span>
                          {item.text}
                          {item.sub.length > 0 && (
                            <ul className="mt-1 space-y-0.5 ml-3">
                              {item.sub.map((s, j) => (
                                <li key={j} className="flex gap-1.5 text-white/40">
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
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{rawDescripcion}</p>
                )
              ) : (
                <p className="text-sm text-white/40">Sin descripción</p>
              )}
            </div>

            {/* Descripción */}
            {descItems.length > 0 && (
              <ul className="space-y-2">
                <h1 className="text-white">Descripción:</h1>
                {descItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-white/80 leading-relaxed">
                    <span className="text-[#7B9BC0] flex-shrink-0 mt-0.5">›</span>
                    <span>
                      {item.text}
                      {item.sub.length > 0 && (
                        <ul className="mt-1 space-y-0.5 ml-3">
                          {item.sub.map((s, j) => (
                            <li key={j} className="flex gap-1.5 text-white/40">
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
          </div>
      )}
        </div>

      </div>

        {/* ── TABS móvil: debajo de info, encima de relacionados ── */}
        {!isVisualOnlyProduct && (
        <div className="md:hidden mt-4 flex flex-col gap-0">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {hasCaracteristicas && (
              <button
                onClick={() => handleTabToggle("caracteristicas")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "caracteristicas"
                    ? "bg-[#7B9BC0] text-white"
                    : "bg-black text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="material-icons-round text-[16px]">list_alt</span>
                Características
              </button>
            )}
            <button
              onClick={() => handleTabToggle("resenas")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                hasCaracteristicas ? "border-l border-white/10" : ""
              } ${
                activeTab === "resenas"
                  ? "bg-[#7B9BC0] text-white"
                  : "bg-black text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="material-icons-round text-[16px]">star_outline</span>
              Reseñas
              {reviews.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "resenas"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white"
                }`}>
                  {reviews.length}
                </span>
              )}
            </button>
          </div>

          {activeTab && (
            <div className="border border-t-0 border-white/10 rounded-b-xl px-4 py-4 bg-[#0a0a0a]">
              {activeTab === "caracteristicas" && hasCaracteristicas && (
                <ul className="space-y-2">
                  {producto.caracteristicas.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span className="w-1 h-1 rounded-full bg-[#7B9BC0] mt-2 flex-shrink-0" />
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
        )}
        {/* ── FIN TABS móvil ───────────────────────────────────── */}
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
          <span className="text-4xl font-extrabold text-white leading-none">
            {avgRating.toFixed(1)}
          </span>
          <div>
            <div className="flex gap-0.5 mb-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-lg ${i < Math.round(avgRating) ? "text-[#7B9BC0]" : "text-white/10"}`}>★</span>
              ))}
            </div>
            <p className="text-xs text-white/40">
              {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/80">Sé el primero en dejar una reseña.</p>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <ul className="space-y-4">
          {reviews.map((r: any) => (
            <li key={r.id} className="pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-sm font-semibold text-white/90">{r.userName}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-sm ${i < r.rating ? "text-[#7B9BC0]" : "text-white/10"}`}>★</span>
                  ))}
                </div>
                <span className="text-xs text-white/30 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmitReview} className="pt-2 space-y-4">
        <p className="text-sm font-medium text-white/80">Escribe una reseña</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/75">Nombre</label>
            <input className={inputCls} placeholder="Tu nombre" value={reviewName}
              onChange={(e) => setReviewName(e.target.value)} required={!isLogged} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/75">Correo</label>
            <input className={inputCls} placeholder="tu@correo.com" type="email" value={reviewEmail}
              onChange={(e) => setReviewEmail(e.target.value)} required={!isLogged} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/80">Calificación</label>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} onClick={() => setReviewRating(i + 1)} role="button"
                aria-label={`Calificación ${i + 1}`}
                className={`text-2xl cursor-pointer transition-transform hover:scale-110 select-none ${
                  i < reviewRating ? "text-[#7B9BC0]" : "text-white/10"
                }`}>★</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/80">Comentario</label>
          <textarea className={`${inputCls} resize-none`} rows={3}
            placeholder="Cuéntanos tu experiencia..." value={reviewText}
            onChange={(e) => setReviewText(e.target.value)} required />
        </div>

        {reviewError && (
          <p className="text-xs text-[#7B9BC0]">{reviewError}</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <button type="submit" disabled={reviewLoading}
            className="px-6 py-2.5 rounded-xl bg-[#7B9BC0] border border-[#7B9BC0] text-white text-sm font-bold hover:bg-[#7B9BC0] hover:shadow-sm disabled:opacity-40 transition-all">
            {reviewLoading ? "Enviando..." : "Publicar reseña"}
          </button>
        </div>
      </form>
    </div>
  );
}

