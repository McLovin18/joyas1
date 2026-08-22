"use client";

import React, { useState, useEffect } from "react";
import { obtenerBodegas } from "../lib/bodegas-db";
import { getSnapshotPricing } from "../lib/pricing";
import { useUser } from "../context/UserContext";
import BottomBarPublic from "../components/BottomBarPublic";
import { obtenerAtributos } from "../lib/atributos-db";
import ModalTransferencia from "../components/ModalTransferencia";
import { useTracking } from "../lib/useAnalytics";

function resolveCartItemKey(item: any) {
  if (!item) return "";
  return item.cartKey || item.variantKey || item.id;
}

function resolveAvailableStock(item: any) {
  if (!item) return 0;

  // Soportar variaciones dinámicas (nuevo sistema)
  if (item.selectedVariations && item.variationAttributeIds && Array.isArray(item.stockVariants)) {
    const allSelected = item.variationAttributeIds.every((attrId: string) => item.selectedVariations[attrId]);
    if (allSelected) {
      const variant = item.stockVariants.find((v: any) => {
        return item.variationAttributeIds.every(
          (attrId: string) => v.attributes?.[attrId] === item.selectedVariations[attrId]
        );
      });
      if (variant) {
        return Number(variant.cantidad ?? 0);
      }
    }
  }

  // Soportar variaciones legacy (talla/color)
  if (item.selectedTalla && item.selectedColor && Array.isArray(item.stockVariants)) {
    const variant = item.stockVariants.find(
      (v: any) => v.talla === item.selectedTalla && v.color === item.selectedColor
    );
    const variantStock = Number(variant?.cantidad ?? variant?.stock ?? variant?.variantStock ?? 0);
    if (variantStock > 0 || variantStock === 0) {
      return variantStock;
    }
  }

  return Number(item.variantStock ?? item.stock ?? 0);
}

// Arma la lista [{ nombre, valor }] de los campos de personalización
// que el usuario llenó para un producto personalizado del carrito.
function resolvePersonalizacionFields(item: any): { nombre: string; valor: string }[] {
  if (!item?.personalizado || !Array.isArray(item?.camposPersonalizacion)) return [];
  if (!item?.personalizacionValues) return [];

  return item.camposPersonalizacion
    .map((campo: any) => {
      const valor = item.personalizacionValues?.[campo.id];
      if (!valor || String(valor).trim() === "") return null;
      return { nombre: campo.nombre, valor: String(valor) };
    })
    .filter(Boolean) as { nombre: string; valor: string }[];
}

// --- Pagina principal del carrito
export default function CartPage() {
  const { carrito: carritoRaw, removeCarrito, addCarrito } = useUser();
  const carrito = carritoRaw as any[];
  const [error, setError] = useState("");
  const { isLogged } = useUser();
  const [atributos, setAtributos] = useState<any[]>([]);
  const [showModalTransferencia, setShowModalTransferencia] = useState(false);
  const { trackPurchaseWhatsApp, trackPurchaseTransfer } = useTracking();

  const calcularPrecioData = (p: any) => {
    const { basePrice, discount, hasDiscount, fakeOldPrice, finalPrice } = getSnapshotPricing(p);
    return { basePrice, discount, hasDiscount, fakeOldPrice, finalPrice };
  };

  useEffect(() => {
    async function loadAtributos() {
      const data = await obtenerAtributos();
      setAtributos(data);
    }

    loadAtributos();
  }, []);

  const subtotal = carrito.reduce((sum, p) => {
    const { finalPrice } = calcularPrecioData(p);
    return sum + finalPrice * (p.cantidad || 1);
  }, 0);

  const total = subtotal;

  // Resumen simple de productos para guardar en la orden de transferencia
  const productosResumen = carrito.map((p) => ({
    nombre: p.nombre,
    cantidad: p.cantidad || 1,
  }));

  // Arma el texto de la variación seleccionada (talla/color legacy o variaciones dinámicas)
  const getVariationText = (p: any): string => {
    if (p.selectedTalla && p.selectedColor) {
      return ` (Talla: ${p.selectedTalla}, Color: ${p.selectedColor})`;
    }

    if (p.selectedVariations && p.variationAttributeIds && p.variationAttributeIds.length > 0) {
      const parts = p.variationAttributeIds
        .map((attrId: string) => {
          const atributo = atributos.find((a: any) => a.id === attrId);
          const attrName = atributo?.nombre || "Opción";
          const value = p.selectedVariations?.[attrId];
          return value ? `${attrName}: ${value}` : null;
        })
        .filter(Boolean);
      return parts.length > 0 ? ` (${parts.join(", ")})` : "";
    }

    return "";
  };

  // Arma el texto de personalización para el mensaje de WhatsApp
  const getPersonalizacionText = (p: any): string => {
    const parts: string[] = [];

    // Campos personalizados
    const campos = resolvePersonalizacionFields(p);
    parts.push(...campos.map((c) => `${c.nombre}: ${c.valor}`));

    // Alto relieve
    if (typeof p.altoRelieve === "boolean") {
      parts.push(`Alto relieve: ${p.altoRelieve ? "Sí" : "No"}`);
    }

    if (parts.length === 0) return "";

    return ` [${parts.join(", ")}]`;
  };

  const generateWhatsAppMessage = async (): Promise<string> => {
    const bodegas = await obtenerBodegas();
    const bodegasMap = new Map(bodegas.map((b) => [b.id, b.tiempoEntrega]));

    const productosText = carrito
      .map((p) => {
        const diasEntrega = bodegasMap.get(p.bodegaId || "technothings") || 10;
        const cantidad = p.cantidad || 1;
        const variationText = getVariationText(p);
        const personalizacionText = getPersonalizacionText(p);
        const textoTiempo = diasEntrega === 1 ? "1 día" : `${diasEntrega} días`;
        return `• ${cantidad}x ${p.nombre}${variationText}${personalizacionText} (Entrega Aproximada en: ${textoTiempo})`;
      })
      .join("\n");

    const headerMsg = "Hola, Me gustaría realizar una compra:";
    const footerMsg = "Quiero confirmar disponibilidad y conocer más detalles. Gracias!";

    // Para WhatsApp, solo incluir subtotal + envío
    const totalWhatsApp = subtotal;
    

    const abonoInicial = totalWhatsApp * 0.3;
    const restante = totalWhatsApp * 0.7;

    const message = `${headerMsg}\n\n${productosText}\n\n--------------------\nTOTAL: $${totalWhatsApp.toFixed(2)}`;
    return encodeURIComponent(message);
  };

  const handleGenerarOrden = async () => {
    setError("");

    if (carrito.length === 0) {
      setError("El carrito está vacío");
      return;
    }

    for (const p of carrito) {
      const availableStock = resolveAvailableStock(p);
      if (p.cantidad > availableStock) {
        setError(`Solo hay ${availableStock} unidades disponibles de "${p.nombre}".`);
        return;
      }
    }

    trackPurchaseWhatsApp().catch(() => {});

    // Abrir la ventana ANTES del await — en iOS Safari, window.open()
    // solo funciona si ocurre de forma síncrona dentro del gesto de click.
    // Si se abre después de un await, el navegador lo bloquea sin avisar.
    const whatsappWindow = window.open("", "_blank");

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "0995110976";
    const message = await generateWhatsAppMessage();
    const url = `https://wa.me/${whatsappNumber}?text=${message}`;

    if (whatsappWindow) {
      whatsappWindow.location.href = url;
    } else {
      // Fallback por si el navegador bloqueó incluso la ventana en blanco
      // (por ejemplo, si algo más rompió el gesto síncrono)
      window.location.href = url;
    }
  };

  const handleAbrirTransferencia = () => {
    setError("");

    if (carrito.length === 0) {
      setError("El carrito está vacío");
      return;
    }

    for (const p of carrito) {
      const availableStock = resolveAvailableStock(p);
      if (p.cantidad > availableStock) {
        setError(`Solo hay ${availableStock} unidades disponibles de "${p.nombre}".`);
        return;
      }
    }

    trackPurchaseTransfer().catch(() => {});
    setShowModalTransferencia(true);
  };


  const handleCantidad = (id: string, cantidad: number) => {
    if (cantidad < 1) return;
    const prod = carrito.find((p) => resolveCartItemKey(p) === id);
    if (prod) {
      const availableStock = resolveAvailableStock(prod);
      if (cantidad > availableStock) {
        setError(
          `Solo hay ${availableStock} unidades disponibles en stock de "${prod.nombre}".`
        );
        return;
      }
      setError("");
      removeCarrito(id);
      addCarrito({ ...prod, cantidad });
    }
  };

  const EmptyCart = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
        <span className="material-icons-round text-4xl text-white/40">
          shopping_bag
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">
          Tu carrito está vacío
        </h3>
        <p className="text-sm text-white/50 mt-1">
          Agrega productos para continuar
        </p>
      </div>
      <a
        href="/products-by-category"
        className="mt-2 inline-flex items-center gap-2 text-white bg-black border border-white/15 hover:border-red-600 hover:shadow-md font-semibold px-6 py-2.5 rounded-xl transition-colors shadow"
      >
        <span className="material-icons-round text-white text-base">storefront</span>
        Ver productos
      </a>
    </div>
  );

  return (
    <>
      <div className="min-h-screen text-white transition-colors">
        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Carrito
            </h1>
            {carrito.length > 0 && (
              <span className="bg-black border border-white/15 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {carrito.length} {carrito.length === 1 ? "producto" : "productos"}
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-600/10 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
              <span className="material-icons-round text-base mt-0.5 shrink-0">error_outline</span>
              {error}
            </div>
          )}

          {carrito.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-3">
                {carrito.map((p) => {
                  const itemKey = resolveCartItemKey(p);
                  const { hasDiscount, fakeOldPrice, finalPrice, discount } = calcularPrecioData(p);
                  const lineTotal = finalPrice * (p.cantidad || 1);
                  const availableStock = resolveAvailableStock(p);
                  const personalizacionFields = resolvePersonalizacionFields(p);

                  return (
                    <div
                      key={itemKey}
                      className="bg-black rounded-2xl border border-red-500 shadow-sm p-4 flex gap-3 sm:gap-4 items-start"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                        <img
                          src={p.imagenes?.[0] || "/no-image.png"}
                          alt={p.nombre}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 text-[var(--text)]">
                          {p.nombre}
                        </p>
                        {p.selectedTalla && p.selectedColor && (
                          <p className="text-xs text-[var(--textSecondary)] mt-0.5">
                            Talla {p.selectedTalla} · Color {p.selectedColor}
                          </p>
                        )}
                        {p.selectedVariations && p.variationAttributeIds && p.variationAttributeIds.length > 0 && (
                          <p className="text-xs text-[var(--textSecondary)] mt-0.5">
                            {p.variationAttributeIds
                              .map((attrId: string) => {
                                const atributo = atributos.find((a: any) => a.id === attrId);
                                const attrName = atributo?.nombre || "Opción";
                                const value = p.selectedVariations?.[attrId];
                                return value ? `${attrName}: ${value}` : null;
                              })
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}

                        {/* Personalización */}
                        {personalizacionFields.length > 0 && (
                          <div className="mt-1.5 rounded-lg border p-2 flex flex-col gap-0.5"
                            style={{ borderColor: "red", background: "black" }}>
                            <span className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1"
                              style={{ color: "var(--textSecondary)" }}>
                              <span className="material-icons-round text-xs">auto_awesome</span>
                              Personalización
                            </span>
                            {personalizacionFields.map((campo, idx) => (
                              <span key={idx} className="text-xs text-[var(--text)]">
                                <span className="text-[var(--textSecondary)]">{campo.nombre}:</span> {campo.valor}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {hasDiscount && (
                            <span className="text-xs text-[var(--textSecondary)] line-through">
                              ${fakeOldPrice?.toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-bold text-[var(--text)]">
                            ${finalPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                              -{discount}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <div className="flex items-center gap-1 bg-[var(--muted)] rounded-lg p-0.5">
                            <button
                              onClick={() => handleCantidad(itemKey, (p.cantidad || 1) - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--card)] transition-colors text-[var(--text)] font-bold text-base"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-[var(--text)]">
                              {p.cantidad || 1}
                            </span>
                            <button
                              onClick={() => handleCantidad(itemKey, (p.cantidad || 1) + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--card)] transition-colors text-[var(--text)] font-bold text-base"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-[var(--textSecondary)]">
                            {availableStock} en stock
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between h-full gap-3 shrink-0">
                        <span className="font-bold text-sm sm:text-base text-[var(--text)]">
                          ${lineTotal.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeCarrito(itemKey)}
                          className="text-[var(--textSecondary)] hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-icons-round text-xl">delete_outline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                

                <a
                  href="/products-by-category"
                  className="inline-flex items-center gap-1.5 text-sm text-white hover:text-red-500 hover:underline mt-1 transition-colors"
                >
                  <span className="material-icons-round text-base">arrow_back</span>
                  Continuar comprando
                </a>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-md p-5 md:sticky md:top-20 space-y-4">
                                    <div>
                    <p className="text-base font-bold mb-3 text-white">Resumen del pedido</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm text-white">
                        <span>
                          Subtotal ({carrito.reduce((n, p) => n + (p.cantidad || 1), 0)} items)
                        </span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>

                    </div>
                    <div className="border-t border-red-500 mt-3 pt-3 flex justify-between font-bold text-base">
                      <span className="text-white">Total</span>
                      <span className="text-white">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={handleGenerarOrden}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm rounded-xl transition-colors shadow-md"
                      title="Enviar pedido por WhatsApp"
                    >
                      <span className="material-icons-round text-base">chat</span>
                      Pedir por WhatsApp
                    </button>

                    <button
                      onClick={handleAbrirTransferencia}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-black border border-white/15 hover:border-red-500 text-white font-bold text-sm rounded-xl transition-colors"
                      title="Pagar el 30% inicial por transferencia bancaria"
                    >
                      <span className="material-icons-round text-base">account_balance</span>
                      Pagar por Transferencia Bancaria
                    </button>
                    <p className="text-[11px] text-center text-white/40">
                      Reserva tu pedido con un 30% inicial. El resto se coordina por WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {!isLogged && <BottomBarPublic />}

      <ModalTransferencia
        open={showModalTransferencia}
        onClose={() => setShowModalTransferencia(false)}
        total={total}
        productos={productosResumen}
      />
    </>
  );
}



