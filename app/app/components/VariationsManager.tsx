"use client";

import React, { useMemo, useCallback } from "react";
import VariationSelector from "./VariationSelector";

interface StockVariant {
  cantidad: number;
  precio?: number;
  attributes?: Record<string, string>;
  label?: string;
  variantKey?: string;
  talla?: string;
  color?: string;
}

interface VariationsManagerProps {
  stockVariants: StockVariant[];
  variationAttributeIds: string[];
  attributeNames: Record<string, string>; // Mapeo de ID -> nombre del atributo
  selectedVariations: Record<string, string>; // Mapeo de atributoId -> valor seleccionado
  onVariationChange: (attrId: string, value: string) => void;
  onStockChange?: (stock: number) => void;
}

export default function VariationsManager({
  stockVariants,
  variationAttributeIds,
  attributeNames,
  selectedVariations,
  onVariationChange,
  onStockChange,
}: VariationsManagerProps) {
  // Calcular opciones disponibles para cada atributo
  const availableOptions = useMemo(() => {
    const formatted: Record<string, string[]> = {};

    variationAttributeIds.forEach((targetAttrId) => {
      const values = new Set<string>();

      stockVariants.forEach((variant) => {
        if (variant.cantidad <= 0) {
          return;
        }

        const attrs = variant.attributes || {};
        const isCompatibleWithOtherSelections = variationAttributeIds.every((attrId) => {
          if (attrId === targetAttrId) {
            return true;
          }

          if (!selectedVariations[attrId]) {
            return true;
          }

          return attrs[attrId] === selectedVariations[attrId];
        });

        if (isCompatibleWithOtherSelections && attrs[targetAttrId]) {
          values.add(attrs[targetAttrId]);
        }
      });

      formatted[targetAttrId] = Array.from(values).sort();
    });

    return formatted;
  }, [stockVariants, variationAttributeIds, selectedVariations]);

  // Calcular stock disponible
  const currentStock = useMemo(() => {
    // Verificar si todas las variaciones requeridas están seleccionadas
    const allSelected = variationAttributeIds.every(
      (attrId) => selectedVariations[attrId]
    );

    if (!allSelected) {
      return 0;
    }

    // Encontrar la variante que coincida
    const matchingVariants = stockVariants.filter((variant) => {
      const attrs = variant.attributes || {};
      return variationAttributeIds.every(
        (attrId) => attrs[attrId] === selectedVariations[attrId]
      );
    });

    return matchingVariants.reduce((sum, variant) => sum + (variant.cantidad || 0), 0);
  }, [stockVariants, variationAttributeIds, selectedVariations]);

  // Notificar cambio de stock
  React.useEffect(() => {
    onStockChange?.(currentStock);
  }, [currentStock, onStockChange]);

  // Seleccionar por defecto la primera opción de la primera variación cuando exista.
  React.useEffect(() => {
    const firstAttrId = variationAttributeIds[0];
    if (!firstAttrId) return;

    const firstOption = availableOptions[firstAttrId]?.[0];
    if (!firstOption) return;

    if (!selectedVariations[firstAttrId]) {
      onVariationChange(firstAttrId, firstOption);
    }
  }, [variationAttributeIds, availableOptions, selectedVariations, onVariationChange]);

  // Manejar cambio de variación - limpiar opciones dependientes
  const handleVariationChange = useCallback(
    (attrId: string, value: string) => {
      // Encontrar el índice del atributo actual
      const currentIndex = variationAttributeIds.indexOf(attrId);

      // Limpiar valores de atributos posteriores
      const newSelections = { ...selectedVariations };
      newSelections[attrId] = value;

      variationAttributeIds.slice(currentIndex + 1).forEach((laterAttrId) => {
        delete newSelections[laterAttrId];
      });

      // Aplicar cambios uno por uno
      onVariationChange(attrId, value);
      variationAttributeIds.slice(currentIndex + 1).forEach((laterAttrId) => {
        onVariationChange(laterAttrId, "");
      });
    },
    [variationAttributeIds, selectedVariations, onVariationChange]
  );

  return (
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
      {/* Encabezado */}
      <div className="mb-5">
        <h3 className="flex items-center gap-2 text-red-500 font-bold text-sm">
          <span className="material-icons-round text-base">
            tune
          </span>
          Opciones del producto
        </h3>

        <p className="text-xs text-white/45 mt-1 leading-relaxed">
          Selecciona las características antes de añadir el producto al carrito.
        </p>
      </div>

      {/* Variaciones */}
      <div className="space-y-5">
        {variationAttributeIds.map((attrId, index) => {
          const attrName = attributeNames[attrId] || attrId;

          const options = availableOptions[attrId] || [];

          const isEnabled =
            index === 0 ||
            !!selectedVariations[variationAttributeIds[index - 1]];

          return (
            <VariationSelector
              key={attrId}
              label={attrName}
              options={options}
              selectedValue={selectedVariations[attrId] || ""}
              onSelect={(value) =>
                handleVariationChange(attrId, value)
              }
              disabled={!isEnabled || options.length === 0}
            />
          );
        })}
      </div>

    </div>
  );
}
