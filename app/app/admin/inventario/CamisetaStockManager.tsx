"use client";

import React, { useState } from "react";
import type { StockVariant } from "../../lib/productos-db";

type CamisetaStockManagerProps = {
  variants: StockVariant[];
  onChange: (variants: StockVariant[]) => void;
};

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORES = ["Rojo", "Azul", "Negro", "Blanco", "Gris", "Verde", "Amarillo", "Naranja", "Púrpura", "Rosa"];

export default function CamisetaStockManager({ variants = [], onChange }: CamisetaStockManagerProps) {
  const [newTalla, setNewTalla] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newCantidad, setNewCantidad] = useState("");
  const [newPrecio, setNewPrecio] = useState("");

  const handleAdd = () => {
    if (!newTalla || !newColor || !newCantidad) {
      alert("Completa talla, color y cantidad");
      return;
    }

    const cantidad = parseInt(newCantidad);
    if (cantidad < 0) {
      alert("La cantidad debe ser mayor o igual a 0");
      return;
    }

    // Verificar si ya existe esa combinación
    const exists = variants.some((v) => v.talla === newTalla && v.color === newColor);
    if (exists) {
      alert(`Ya existe stock para ${newTalla} - ${newColor}`);
      return;
    }

    const newVariant: StockVariant = {
      talla: newTalla,
      color: newColor,
      cantidad,
      ...(newPrecio && { precio: parseFloat(newPrecio) }),
    };

    onChange([...variants, newVariant]);
    setNewTalla("");
    setNewColor("");
    setNewCantidad("");
    setNewPrecio("");
  };

  const handleRemove = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const handleUpdateCantidad = (index: number, newCantidad: number) => {
    const updated = [...variants];
    updated[index].cantidad = Math.max(0, newCantidad);
    onChange(updated);
  };

  const handleUpdatePrecio = (index: number, newPrecio: number) => {
    const updated = [...variants];
    if (newPrecio > 0) {
      updated[index].precio = newPrecio;
    } else {
      delete updated[index].precio;
    }
    onChange(updated);
  };

  const totalStock = variants.reduce((sum, v) => sum + v.cantidad, 0);

  return (
    <div className="bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl p-5 border border-purple-200 dark:border-purple-900">
      <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-2">
        Stock por Talla y Color
      </h3>
      <p className="text-xs text-purple-600 dark:text-purple-300 mb-4">
        Si dejas el precio vacío, usará el precio global del producto
      </p>

      {/* Tabla de stock */}
      {variants.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-purple-300 dark:border-purple-700">
                <th className="p-2 text-left">Talla</th>
                <th className="p-2 text-left">Color</th>
                <th className="p-2 text-left">Cantidad</th>
                <th className="p-2 text-left">Precio ($)</th>
                <th className="p-2 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, idx) => (
                <tr key={idx} className="border-b border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 dark:hover:bg-purple-900/30">
                  <td className="p-2 font-semibold">{variant.talla}</td>
                  <td className="p-2">{variant.color}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={variant.cantidad}
                      onChange={(e) => handleUpdateCantidad(idx, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.precio || ''}
                      onChange={(e) => handleUpdatePrecio(idx, parseFloat(e.target.value) || 0)}
                      placeholder="Precio global"
                      className="w-20 px-2 py-1 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-purple-300 dark:border-purple-700 font-bold bg-purple-100 dark:bg-purple-900/30">
                <td colSpan={2} className="p-2 text-right">Total Stock:</td>
                <td className="p-2">{variants.reduce((sum, v) => sum + v.cantidad, 0)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Agregar nuevo */}
      <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl">
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Agregar nuevo</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Talla
            </label>
            <select
              value={newTalla}
              onChange={(e) => setNewTalla(e.target.value)}
              className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Selecciona</option>
              {TALLAS.map((talla) => (
                <option key={talla} value={talla}>
                  {talla}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Color
            </label>
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Selecciona</option>
              {COLORES.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              min="0"
              value={newCantidad}
              onChange={(e) => setNewCantidad(e.target.value)}
              placeholder="0"
              className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Precio ($) <span className="text-slate-400">opcional</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrecio}
              onChange={(e) => setNewPrecio(e.target.value)}
              placeholder="Usa precio global"
              className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Agregar Stock
        </button>
      </div>
    </div>
  );
}

