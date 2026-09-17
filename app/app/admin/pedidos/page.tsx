"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  obtenerOrdenesTransferencia,
  actualizarEstadoOrdenTransferencia,
  eliminarOrdenTransferencia,
  OrdenTransferencia,
  EstadoOrdenTransferencia,
} from "../../lib/ordenes-transferencia-db";

const ESTADO_CONFIG: Record<
  EstadoOrdenTransferencia,
  { label: string; bg: string; text: string }
> = {
  pendiente: { label: "Pendiente", bg: "#FAEEDA", text: "#633806" },
  confirmado: { label: "Confirmado", bg: "#EAF3DE", text: "#27500A" },
  rechazado: { label: "Rechazado", bg: "#FCEBEB", text: "#791F1F" },
};

function formatFecha(ts: any): string {
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function whatsappLink(numero: string) {
  const limpio = numero.replace(/[^0-9]/g, "");
  return `https://wa.me/${limpio}`;
}

export default function OrdenesTransferenciaAdminPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<OrdenTransferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionada, setSeleccionada] = useState<OrdenTransferencia | null>(null);
  const [filtro, setFiltro] = useState<EstadoOrdenTransferencia | "todas">("todas");

  const cargarOrdenes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await obtenerOrdenesTransferencia();
      setOrdenes(data);
    } catch (e) {
      console.error(e);
      setError("Error al cargar las órdenes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const handleCambiarEstado = async (
    id: string,
    estado: EstadoOrdenTransferencia
  ) => {
    await actualizarEstadoOrdenTransferencia(id, estado);
    setOrdenes((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));
    setSeleccionada((prev) => (prev && prev.id === id ? { ...prev, estado } : prev));
  };

  const handleEliminarOrden = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta orden? Esta acción no se puede deshacer.")) {
      return;
    }
    try {
      await eliminarOrdenTransferencia(id);
      setOrdenes((prev) => prev.filter((o) => o.id !== id));
      if (seleccionada && seleccionada.id === id) {
        setSeleccionada(null);
      }
    } catch (e) {
      console.error(e);
      alert("Error al eliminar la orden. Intenta de nuevo.");
    }
  };

  const ordenesFiltradas =
    filtro === "todas" ? ordenes : ordenes.filter((o) => o.estado === filtro);

  const pendientesCount = ordenes.filter((o) => o.estado === "pendiente").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-1 inline-flex items-center gap-1"
            >
              ← Volver al panel
            </button>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Órdenes</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Pagos iniciales por transferencia bancaria (30%)
            </p>
          </div>
          {pendientesCount > 0 && (
            <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
              {pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 mb-6 w-fit">
          {(["todas", "pendiente", "confirmado", "rechazado"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filtro === f
                  ? "bg-purple-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-slate-400 dark:text-slate-500">Cargando órdenes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm font-medium">
            {error}
          </div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No hay órdenes {filtro !== "todas" ? `en estado "${filtro}"` : "todavía"}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenesFiltradas.map((orden) => {
              const estadoInfo = ESTADO_CONFIG[orden.estado];
              return (
                <div
                  key={orden.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  {/* Evidencia */}
                  <button
                    onClick={() => setSeleccionada(orden)}
                    className="w-full sm:w-20 h-40 sm:h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
                  >
                    <img
                      src={orden.comprobanteURL}
                      alt="Comprobante de pago"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {orden.nombre}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: estadoInfo.bg, color: estadoInfo.text }}
                      >
                        {estadoInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {orden.whatsapp} · {orden.banco} · {formatFecha(orden.fecha)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Total:{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          ${orden.montoTotal.toFixed(2)}
                        </span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Pagado ({orden.porcentajeInicial}%):{" "}
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          ${orden.montoInicial.toFixed(2)}
                        </span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Falta:{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          ${orden.montoRestante.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setSeleccionada(orden)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Ver más
                    </button>
                    <a
                      href={whatsappLink(orden.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
                    >
                      WhatsApp
                    </a>
                    <button
                      onClick={() => orden.id && handleEliminarOrden(orden.id)}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal "Ver más" */}
      {seleccionada && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSeleccionada(null)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Detalle de la orden
              </h2>
              <button
                onClick={() => setSeleccionada(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-5">
              <img
                src={seleccionada.comprobanteURL}
                alt="Comprobante de pago"
                className="w-full max-h-80 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
                {[
                  ["Nombre", seleccionada.nombre],
                  ["WhatsApp", seleccionada.whatsapp],
                  ["Banco", seleccionada.banco],
                  ["Total del pedido", `$${seleccionada.montoTotal.toFixed(2)}`],
                  [
                    `Pago inicial (${seleccionada.porcentajeInicial}%)`,
                    `$${seleccionada.montoInicial.toFixed(2)}`,
                  ],
                  ["Restante por cobrar", `$${seleccionada.montoRestante.toFixed(2)}`],
                  ["Fecha", formatFecha(seleccionada.fecha)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/40"
                  >
                    <span className="text-slate-400 dark:text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {seleccionada.productos?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Productos
                  </p>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1">
                    {seleccionada.productos.map((prod, idx) => (
                      <p key={idx} className="text-sm text-slate-700 dark:text-slate-200">
                        • {prod.cantidad}x {prod.nombre}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={whatsappLink(seleccionada.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors"
                >
                  Contactar por WhatsApp
                </a>
                {seleccionada.estado === "pendiente" && (
                  <>
                    <button
                      onClick={() =>
                        seleccionada.id &&
                        handleCambiarEstado(seleccionada.id, "confirmado")
                      }
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold text-sm transition-colors"
                    >
                      Confirmar pago
                    </button>
                    <button
                      onClick={() =>
                        seleccionada.id &&
                        handleCambiarEstado(seleccionada.id, "rechazado")
                      }
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm transition-colors"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                <button
                  onClick={() => seleccionada.id && handleEliminarOrden(seleccionada.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm transition-colors"
                >
                  Eliminar orden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}