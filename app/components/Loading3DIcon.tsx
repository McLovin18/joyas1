"use client";

import React from "react";

export function Loading3DIcon() {
  return (
    <div className="flex flex-col items-center justify-center py-10 select-none">
      
      {/* Bolita de carga */}
      <div
        className="
          w-10 h-10
          rounded-full
          animate-bounce
          shadow-lg
        "
      />

      {/* Texto */}
      <p className="mt-5 text-sm text-[var(--textSecondary)] font-medium">
        Cargando contenido de Grupo Caceres Morales
      </p>

    </div>
  );
}