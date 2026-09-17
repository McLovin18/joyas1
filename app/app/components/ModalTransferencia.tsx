"use client";

import React, { useState } from "react";
import {
  crearOrdenTransferencia,
  subirComprobanteTransferencia,
  ProductoResumen,
} from "../lib/ordenes-transferencia-db";

// ---- Datos bancarios: AJUSTA con las cuentas reales del cliente ----
// Agrega, quita o edita bancos aquí; el cliente elige uno antes de ver los datos.
interface DatosBanco {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  cedulaRuc: string;
  correo: string;
}

const BANCOS_DISPONIBLES: DatosBanco[] = [
  {
    id: "pichincha",
    banco: "Banco Pichincha",
    tipoCuenta: "Cuenta de Ahorros",
    numeroCuenta: "0000000000",
    titular: "Juan Perez",
    cedulaRuc: "0000000000",
    correo: "mvpaccesories@gmail.com",
  },
  {
    id: "guayaquil",
    banco: "Banco de Guayaquil",
    tipoCuenta: "Cuenta de Ahorros",
    numeroCuenta: "0000000000",
    titular: "Juan Perez",
    cedulaRuc: "0000000000",
    correo: "mvpaccesories@gmail.com",
  }
];

const PORCENTAJE_INICIAL = 30;

interface ModalTransferenciaProps {
  open: boolean;
  onClose: () => void;
  total: number;
  productos: ProductoResumen[];
}

type Paso = "form" | "enviando" | "exito";

export default function ModalTransferencia({
  open,
  onClose,
  total,
  productos,
}: ModalTransferenciaProps) {
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bancoSeleccionadoId, setBancoSeleccionadoId] = useState<string>("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>("");
  const [error, setError] = useState("");
  const [paso, setPaso] = useState<Paso>("form");

  const bancoSeleccionado = BANCOS_DISPONIBLES.find(
    (b) => b.id === bancoSeleccionadoId
  );

  const montoInicial = Number(((total * PORCENTAJE_INICIAL) / 100).toFixed(2));
  const montoRestante = Number((total - montoInicial).toFixed(2));

  if (!open) return null;

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El comprobante debe ser una imagen (foto o captura de pantalla).");
      return;
    }
    setError("");
    setImagen(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const resetYCerrar = () => {
    setNombre("");
    setWhatsapp("");
    setBancoSeleccionadoId("");
    setImagen(null);
    setPreviewURL("");
    setError("");
    setPaso("form");
    onClose();
  };

  const handleEnviar = async () => {
    setError("");

    if (!nombre.trim()) {
      setError("Ingresa tu nombre completo.");
      return;
    }
    if (!whatsapp.trim() || whatsapp.trim().length < 7) {
      setError("Ingresa un número de WhatsApp válido.");
      return;
    }
    if (!bancoSeleccionado) {
      setError("Selecciona el banco al que realizaste la transferencia.");
      return;
    }
    if (!imagen) {
      setError("Sube una imagen del comprobante de transferencia.");
      return;
    }

    try {
      setPaso("enviando");
      const comprobanteURL = await subirComprobanteTransferencia(imagen, nombre);
      await crearOrdenTransferencia({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        montoTotal: total,
        porcentajeInicial: PORCENTAJE_INICIAL,
        comprobanteURL,
        productos,
        banco: bancoSeleccionado.banco,
      });
      setPaso("exito");
    } catch (err) {
      console.error(err);
      setError("Hubo un problema al enviar tu pago inicial. Intenta de nuevo.");
      setPaso("form");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={paso === "enviando" ? undefined : resetYCerrar}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-amber-300 text-xl">
              account_balance
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Pago inicial por transferencia
            </h2>
          </div>
          <button
            onClick={resetYCerrar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-icons-round text-lg">close</span>
          </button>
        </div>

        {paso === "exito" ? (
          <div className="flex flex-col items-center text-center gap-4 px-6 py-12">
            <div className="w-16 h-16 rounded-full bg-green-600/15 border border-green-600/30 flex items-center justify-center">
              <span className="material-icons-round text-3xl text-green-500">
                check_circle
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                ¡Pago inicial enviado!
              </h3>
              <p className="text-sm text-white/50 mt-1.5 max-w-sm">
                Recibimos tu comprobante. Nuestro equipo lo validará y te
                contactará por WhatsApp para coordinar el resto de tu pedido.
              </p>
            </div>
            <button
              onClick={resetYCerrar}
              className="mt-2 px-6 py-2.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-white font-semibold text-sm transition-colors"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-5">

            {/* 2. Datos del cliente */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Tus datos
              </p>
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. María Fernanda Solórzano"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-black text-white text-sm outline-none focus:border-amber-300 transition-colors placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej. 0991234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-black text-white text-sm outline-none focus:border-amber-300 transition-colors placeholder:text-white/30"
                />
              </div>
            </div>

            {/* 3. Datos bancarios */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Selecciona un banco
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BANCOS_DISPONIBLES.map((b) => {
                  const activo = b.id === bancoSeleccionadoId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBancoSeleccionadoId(b.id)}
                      className={`flex items-center gap-2 px-3.5 py-3 rounded-xl border text-left text-sm font-semibold transition-colors ${
                        activo
                          ? "border-amber-300 bg-red-600/10 text-white"
                          : "border-white/10 bg-black text-white/70 hover:border-white/30"
                      }`}
                    >
                      <span
                        className={`material-icons-round text-base ${
                          activo ? "text-amber-200" : "text-white/30"
                        }`}
                      >
                        {activo ? "radio_button_checked" : "radio_button_unchecked"}
                      </span>
                      {b.banco}
                    </button>
                  );
                })}
              </div>

              {bancoSeleccionado && (
                <div className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden mt-1">
                  {[
                    ["Banco", bancoSeleccionado.banco],
                    ["Tipo de cuenta", bancoSeleccionado.tipoCuenta],
                    ["Número de cuenta", bancoSeleccionado.numeroCuenta],
                    ["Titular", bancoSeleccionado.titular],
                    ["Cédula/RUC", bancoSeleccionado.cedulaRuc],
                    ["Correo", bancoSeleccionado.correo],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-3.5 py-2 text-sm bg-black"
                    >
                      <span className="text-white/50">{label}</span>
                      <span className="font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Subir comprobante */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Comprobante de pago
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-2xl py-6 px-4 cursor-pointer hover:border-amber-300 transition-colors bg-black">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagenChange}
                  className="hidden"
                />
                {previewURL ? (
                  <img
                    src={previewURL}
                    alt="Vista previa del comprobante"
                    className="max-h-40 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <span className="material-icons-round text-2xl text-white/40">
                      upload
                    </span>
                    <span className="text-sm text-white/50 text-center">
                      Subir imagen del comprobante de transferencia
                    </span>
                  </>
                )}
              </label>
              {imagen && (
                <button
                  type="button"
                  onClick={() => {
                    setImagen(null);
                    setPreviewURL("");
                  }}
                  className="text-xs text-white/50 hover:text-amber-300 transition-colors"
                >
                  Quitar imagen
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-600/10 border border-red-600/40 text-amber-300 rounded-xl px-4 py-3 text-sm">
                <span className="material-icons-round text-base mt-0.5 shrink-0">
                  error_outline
                </span>
                {error}
              </div>
            )}

            <button
              onClick={handleEnviar}
              disabled={paso === "enviando"}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-amber-300 hover:bg-amber-400 disabled:opacity-60 text-white font-extrabold text-sm rounded-xl transition-colors shadow-md"
            >
              {paso === "enviando" ? (
                <>
                  <span className="material-icons-round text-base animate-spin">
                    progress_activity
                  </span>
                  Enviando...
                </>
              ) : (
                <>
                  <span className="material-icons-round text-base">send</span>
                  Enviar pago inicial
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}