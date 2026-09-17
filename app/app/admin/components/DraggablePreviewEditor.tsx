"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import type { FieldPosition } from "../../lib/landing-types";

type ElementConfig = {
  label: string;
  defaultPosition: FieldPosition;
};

const ELEMENTS: Record<string, ElementConfig> = {
  title: { label: "Título", defaultPosition: { left: 50, top: 200, width: 800, height: 150, zIndex: 10 } },
  buttonText: { label: "Botón", defaultPosition: { left: 50, top: 650, width: 300, height: 60, zIndex: 10 } },
};

type DragState = {
  field: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
};

type ResizeState = {
  field: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

interface DraggablePreviewEditorProps {
  sectionType: "hero" | "banner";
  device: "desktop" | "mobile";
  positions: Record<string, { desktop?: FieldPosition; mobile?: FieldPosition }>;
  onPositionChange: any;
  image?: string;
  values?: Record<string, any>;
}

export default function DraggablePreviewEditor({
  sectionType,
  device,
  positions,
  onPositionChange,
  image,
  values,
}: DraggablePreviewEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });
  const [showModal, setShowModal] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const hasRenderableValue = (field: string) => {
    const value = values?.[field];
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  };

  const editableFields = useMemo(() => {
    const baseFields =
      sectionType === "hero"
        ? ["title", "buttonText"]
        : sectionType === "banner"
          ? ["title", "subtitle", "buttonText"]
          : [];

    return baseFields.filter((field) => hasRenderableValue(field));
  }, [sectionType, values]);

  const renderFieldContent = (field: string) => {
    const value = values?.[field];
    if (sectionType === "hero") {
      if (field === "title") {
        return (
          <div className="pointer-events-none text-center px-3 py-1 whitespace-nowrap font-serif italic text-slate-900 dark:text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
            {value}
          </div>
        );
      }

      if (field === "buttonText") {
        return (
          <div className="pointer-events-none inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white text-black font-bold px-4 py-2 shadow-md border border-slate-200">
            <span>{value}</span>
            <span className="material-icons-round text-sm">arrow_forward</span>
          </div>
        );
      }
    }

    return (
      <div className="pointer-events-none text-center px-2 py-1">
        {value}
      </div>
    );
  };

  const getFieldChromeClassName = (field: string, isSelected: boolean) => {
    if (sectionType === "hero") {
      return isSelected
        ? "absolute cursor-move transition-all ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent rounded-2xl"
        : "absolute cursor-move transition-all rounded-2xl";
    }

    return `absolute cursor-move border-2 flex items-center justify-center transition-all ${
      isSelected
        ? "border-purple-500 bg-purple-200/30 dark:bg-purple-900/30"
        : "border-blue-400 bg-blue-100/50 dark:bg-blue-900/30"
    } text-slate-800 dark:text-white rounded-xl`;
  };

  const shouldUseAutoSize = (field: string) =>
    sectionType === "hero" && (field === "title" || field === "buttonText");

  // Monitorear cambios de tamaño del contenedor
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === containerRef.current?.parentElement) {
          const rect = entry.target.getBoundingClientRect();
          // Usar casi todo el ancho disponible (dejando márgenes mínimos)
          // Sin límites restrictivos para que la imagen se vea completa
          const availableWidth = Math.max(300, rect.width - 32); // -32 para márgenes (16px c/lado)
          
          // Mantener aspect ratio EXACTO a las imágenes: hero 12:5, banner 7:3
          const aspectRatio = sectionType === "hero" 
            ? 12 / 5  // 2.4 - IGUAL a 2400x1000
            : 7 / 3;  // ~2.33
          
          const height = Math.round(availableWidth / aspectRatio);
          
          setContainerSize({
            width: availableWidth,
            height,
          });
        }
      }
    });

    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [device, sectionType]);

  // Forzar recalc de containerSize cuando cambia el dispositivo
  useEffect(() => {
    if (containerRef.current?.parentElement) {
      const rect = containerRef.current.parentElement.getBoundingClientRect();
      const availableWidth = Math.max(300, rect.width - 32);
      
      const aspectRatio = sectionType === "hero" 
        ? 12 / 5  // 2.4
        : 7 / 3;
      
      const height = Math.round(availableWidth / aspectRatio);
      
      setContainerSize({
        width: availableWidth,
        height,
      });
    }
  }, [device]);

  // Obtener dimensiones reales de la imagen
  useEffect(() => {
    if (image) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = image;
    }
  }, [image]);

  const getPosition = (field: string): FieldPosition => {
    const pos = positions[field]?.[device];
    if (pos) return pos;
    return ELEMENTS[field]?.defaultPosition || { left: 0, top: 0, width: 200, height: 100, zIndex: 10 };
  };

  // Calcular el factor de escala entre dimensiones reales y tamaño actual del contenedor
  const getScaledPosition = (field: string): FieldPosition => {
    const pos = getPosition(field);
    
    // Si no tenemos dimensiones de imagen, retornar posición normal
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return pos;
    }
    
    // Calcular factor de escala
    const scaleX = containerSize.width / imageDimensions.width;
    const scaleY = containerSize.height / imageDimensions.height;
    
    return {
      left: (pos.left || 0) * scaleX,
      top: (pos.top || 0) * scaleY,
      width: (pos.width || 200) * scaleX,
      height: (pos.height || 100) * scaleY,
      zIndex: pos.zIndex || 10,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, field: string, action: "drag" | "resize") => {
    e.preventDefault();
    const pos = getPosition(field);

    if (action === "drag") {
      setDragState({
        field,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: pos.left || 0,
        startTop: pos.top || 0,
      });
    } else if (action === "resize") {
      setResizeState({
        field,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: pos.width || 200,
        startHeight: pos.height || 100,
      });
    }

    // Agregar a seleccionados
    if (!selectedFields.has(field)) {
      setSelectedFields(new Set([...Array.from(selectedFields), field]));
    }
  };

  // Calcular factor de escala inverso para transformar movimientos de mouse en preview escalado
  const getInverseScale = () => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { scaleX: 1, scaleY: 1 };
    }
    return {
      scaleX: imageDimensions.width / containerSize.width,
      scaleY: imageDimensions.height / containerSize.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        // Si estamos en el modal (1:1), no escalar; en preview sí se escala.
        const { scaleX, scaleY } = showModal ? { scaleX: 1, scaleY: 1 } : getInverseScale();

        const deltaX = (e.clientX - dragState.startX) * scaleX;
        const deltaY = (e.clientY - dragState.startY) * scaleY;
        const newLeft = Math.max(0, dragState.startLeft + deltaX);
        const newTop = Math.max(0, dragState.startTop + deltaY);

        const pos = getPosition(dragState.field);
        onPositionChange(dragState.field, {
          ...pos,
          left: newLeft,
          top: newTop,
        });
      }

      if (resizeState) {
        // Si estamos en el modal, no escalar; si estamos en el preview, escalar
        const scaleX = showModal ? 1 : getInverseScale().scaleX;
        const scaleY = showModal ? 1 : getInverseScale().scaleY;
        
        const deltaX = (e.clientX - resizeState.startX) * scaleX;
        const deltaY = (e.clientY - resizeState.startY) * scaleY;
        const newWidth = Math.max(50, resizeState.startWidth + deltaX);
        const newHeight = Math.max(30, resizeState.startHeight + deltaY);

        const pos = getPosition(resizeState.field);
        onPositionChange(resizeState.field, {
          ...pos,
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, resizeState, showModal, imageDimensions, containerSize]);

  useEffect(() => {
    // Keep selection in sync when fields become hidden due to empty values.
    setSelectedFields((prev) => {
      const next = new Set(Array.from(prev).filter((field) => editableFields.includes(field)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [editableFields]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
        Vista previa ({device === "desktop" ? "Desktop" : "Mobile"})
        {imageDimensions.width > 0 && (
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
            Contenedor: {containerSize.width.toFixed(0)}×{containerSize.height.toFixed(0)}px | Escala: {(getInverseScale().scaleX).toFixed(2)}x
          </span>
        )}
      </div>
      <div className="w-full flex justify-center">
        <div
          ref={containerRef}
          onClick={(e) => {
            // Only open modal when click is on the container itself (not on draggable children)
            // and when there's an image. Also avoid opening while dragging/resizing.
            if (!image) return;
            if (dragState || resizeState) return;
            if (e.target === containerRef.current) {
              setShowModal(true);
            }
          }}
          className="relative border-2 border-slate-300 dark:border-slate-600 overflow-hidden rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all hover:border-purple-400"
          style={{
            width: containerSize.width,
            height: containerSize.height,
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#f8fafc",
            transition: "all 0.2s ease-out",
          }}
        >
        {/* Grid para referencias */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {Array.from({ length: Math.max(4, Math.floor(containerSize.width / 100)) }).map((_, i) => (
            <div
              key={i}
              className="absolute border-l border-slate-400"
              style={{ 
                left: (i + 1) * (containerSize.width / (Math.max(4, Math.floor(containerSize.width / 100)))), 
                top: 0, 
                height: "100%" 
              }}
            />
          ))}
        </div>

        {/* Elementos arrastrables */}
        {(sectionType === "hero" || sectionType === "banner") &&
          editableFields.map((field) => {
            const pos = getScaledPosition(field);
            const isSelected = selectedFields.has(field);

            return (
              <div
                key={field}
                className={getFieldChromeClassName(field, isSelected)}
                style={{
                  left: pos.left,
                  top: pos.top,
                  ...(pos.zIndex !== undefined ? { zIndex: pos.zIndex } : {}),
                  ...(pos.width !== undefined && !shouldUseAutoSize(field) ? { width: pos.width } : {}),
                  ...(pos.height !== undefined && !shouldUseAutoSize(field) ? { height: pos.height } : {}),
                  fontSize: field === "title" ? "20px" : field === "buttonText" ? "14px" : "16px",
                }}
                onMouseDown={(e) => handleMouseDown(e, field, "drag")}
              >
                {/* Punto de referencia en esquina superior izquierda */}
                <div
                  className={`absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full cursor-grab active:cursor-grabbing border-2 border-red-700 shadow-lg ${sectionType === "hero" ? "opacity-70" : ""}`}
                  title="Punto de referencia - agarra aquí para mover"
                />
                
                {renderFieldContent(field)}
                
                {/* Handle de redimensionamiento en esquina inferior derecha */}
                <div
                  className={`absolute bottom-0 right-0 w-4 h-4 bg-purple-600 cursor-se-resize hover:bg-purple-700 border border-purple-800 ${sectionType === "hero" ? "opacity-70" : ""}`}
                  onMouseDown={(e) => handleMouseDown(e, field, "resize")}
                  title="Arrastra para redimensionar"
                />
              </div>
            );
          })}

        {editableFields.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-white/85 text-slate-600 text-xs border border-slate-200 shadow-sm">
              No hay elementos con valor para posicionar
            </span>
          </div>
        )}
        </div>
      </div>

      {/* Información de elementos seleccionados */}
      {selectedFields.size > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Seleccionados: {Array.from(selectedFields)
            .map((f) => ELEMENTS[f]?.label)
            .join(", ")}
        </div>
      )}

      {/* Modal de posicionamiento en dimensiones reales */}
      {showModal && image && imageDimensions.width > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-950 shadow-2xl w-screen h-screen max-w-none max-h-none flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Editor de posiciones (Dimensiones reales: {imageDimensions.width} × {imageDimensions.height}px)
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Contenedor de scroll con la imagen */}
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 flex items-start justify-start p-4">
              <div
                className="relative shrink-0 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-lg"
                style={{
                  width: imageDimensions.width,
                  height: imageDimensions.height,
                  aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`,
                  backgroundImage: `url(${image})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Elementos arrastrables en tamaño real */}
                {(sectionType === "hero" || sectionType === "banner") &&
                  editableFields.map((field) => {
                    const pos = getPosition(field);
                    const isSelected = selectedFields.has(field);

                    return (
                      <div
                        key={field}
                        className={getFieldChromeClassName(field, isSelected)}
                        style={{
                          left: pos.left,
                          top: pos.top,
                          ...(pos.zIndex !== undefined ? { zIndex: pos.zIndex } : {}),
                          ...(pos.width !== undefined && !shouldUseAutoSize(field) ? { width: pos.width } : {}),
                          ...(pos.height !== undefined && !shouldUseAutoSize(field) ? { height: pos.height } : {}),
                          fontSize: field === "title" ? "20px" : field === "buttonText" ? "14px" : "16px",
                        }}
                        onMouseDown={(e) => handleMouseDown(e, field, "drag")}
                      >
                        {/* Punto de referencia */}
                        <div
                          className={`absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full cursor-grab active:cursor-grabbing border-2 border-red-700 shadow-lg ${sectionType === "hero" ? "opacity-70" : ""}`}
                          title="Punto de referencia"
                        />
                        
                        {renderFieldContent(field)}
                        
                        {/* Handle de redimensionamiento */}
                        <div
                          className={`absolute bottom-0 right-0 w-4 h-4 bg-purple-600 cursor-se-resize hover:bg-purple-700 border border-purple-800 ${sectionType === "hero" ? "opacity-70" : ""}`}
                          onMouseDown={(e) => handleMouseDown(e, field, "resize")}
                          title="Redimensionar"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

