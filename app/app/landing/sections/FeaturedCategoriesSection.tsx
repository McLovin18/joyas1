"use client";

import React from "react";
import type {
  LandingSectionStyles,
  LandingFieldStyle,
} from "../../lib/landing-types";

export type FeaturedCategoryItem = {
  title?: string;
  image?: string | null;
  link?: string;
  // Opcionales, para acercarse al layout tipo "galería"
  tag?: string; // ej: "FERRARI · PORSCHE · MOTORSPORT" — si no se define, se usa un fallback tipo "COLECCIÓN 01"
  description?: string; // texto corto debajo del título, superpuesto en la imagen
};

export type FeaturedCategoriesSectionProps = {
  title?: string;
  items?: FeaturedCategoryItem[];
  styles?: LandingSectionStyles;
  fieldStyles?: Record<string, LandingFieldStyle>;
  device?: "desktop" | "mobile";
};

// Divide el título en dos líneas: todo menos la última palabra (blanco)
// y la última palabra (rojo), imitando "HOT" / "KILLS".
function splitTitle(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) {
    return { lead: "", accent: words[0] || "" };
  }
  const accent = words[words.length - 1];
  const lead = words.slice(0, -1).join(" ");
  return { lead, accent };
}

export default function FeaturedCategoriesSection({
  title,
  items,
  styles,
  fieldStyles,
}: FeaturedCategoriesSectionProps) {
  const bg = styles?.backgroundColor;
  const color = styles?.textColor;
  const paddingTop = styles?.paddingTop || (typeof window !== "undefined" && window.innerWidth < 768 ? "0.5rem" : "2rem");
  const paddingBottom = styles?.paddingBottom || (typeof window !== "undefined" && window.innerWidth < 768 ? "0.5rem" : "2rem");

  const categories = (items || []).filter(
    (c) => c && (c.title || c.image || c.link)
  );

  if (!categories.length && !title) return null;

  return (
    <section
      style={{
        ...(color ? { color } : {}),
        paddingTop,
        paddingBottom,
      }}
      className="px-4 lg:px-6 m-0 bg-black"
    >
      <div className="max-w-6xl mx-auto text-[var(--text)] relative">
        {title && (
          <h2
            className="section-title py-2 text-center"
            style={fieldStyles?.title || { color: "var(--text)" }}
          >
            {title}
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
          {categories.map((cat, idx) => {
            const { lead, accent } = splitTitle(cat.title || "");
            const eyebrow =
              cat.tag ||
              `COLECCIÓN ${String(idx + 1).padStart(2, "0")}`;
            const counter = `${String(idx + 1).padStart(2, "0")} / ${String(
              categories.length
            ).padStart(2, "0")}`;

            return (
              <a
                key={idx}
                href={cat.link || "#"}
                className="group relative block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black cursor-pointer"
              >
                {cat.image && (
                  <div className="relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/5] w-full h-full">
                    <img
                      src={cat.image}
                      alt={cat.title || "Categoría"}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Overlay de oscurecimiento para legibilidad del texto */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none" />

                    {/* Fila superior: eyebrow + contador */}
                    <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-5 z-10">
                      <span className="text-[9px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/70">
                        {eyebrow}
                      </span>
                      <span className="text-[9px] sm:text-xs font-mono tracking-widest text-white/50">
                        {counter}
                      </span>
                    </div>

                    {/* Contenido inferior: título + descripción, dentro de la imagen */}
                    <div className="absolute bottom-0 inset-x-0 px-4 pb-4 sm:px-6 sm:pb-6 z-10">
                      {cat.title && (
                        <h3
                          className="uppercase font-black leading-[0.95] text-2xl sm:text-4xl md:text-5xl"
                          style={fieldStyles?.itemTitle}
                        >
                          {lead && (
                            <span className="block text-white drop-shadow-lg">
                              {lead}
                            </span>
                          )}
                          <span className="block text-red-600 drop-shadow-lg">
                            {accent}
                          </span>
                        </h3>
                      )}

                      {cat.description && (
                        <p className="mt-2 sm:mt-3 max-w-xs sm:max-w-sm text-[11px] sm:text-sm leading-snug text-white/70">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback: si no hay imagen, mostramos el título simple debajo */}
                {!cat.image && cat.title && (
                  <h3
                    className="section-subtitle page-lead text-center md:text-left p-3"
                    style={fieldStyles?.itemTitle || { color: "var(--text, #584738)" }}
                  >
                    {cat.title}
                  </h3>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}