"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type {
  LandingSectionStyles,
  LandingFieldStyle,
} from "../../lib/landing-types";

type GalleryItem = { title?: string; description?: string; image?: string };

export type GallerySectionProps = {
  title?: string;
  images?: string[];
  items?: GalleryItem[];
  styles?: LandingSectionStyles;
  fieldStyles?: Record<string, LandingFieldStyle>;
};

const AUTOPLAY_MS = 5000;

// Columnas según breakpoint (móvil = 1 card)
function getColumns(width: number, total: number): number {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  return Math.min(3, total);
}

export default function GallerySection({
  title,
  images = [],
  items,
  styles,
  fieldStyles,
}: GallerySectionProps) {
  const galleryItems = (
    items && items.length
      ? items
      : images.map((src) => ({ title: "", image: src }))
  ) as GalleryItem[];

  // ── State ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cols, setCols] = useState(1); // mobile-first
  const [isPaused, setIsPaused] = useState(false);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // ── Responsive columns ──
  useEffect(() => {
    const update = () => setCols(getColumns(window.innerWidth, galleryItems.length));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [galleryItems.length]);

  const isMobile = cols === 1;
  const effectiveCols = Math.max(1, Math.min(cols, galleryItems.length));
  const needsCarousel = galleryItems.length > effectiveCols;

  const paddingTop = styles?.paddingTop || (isMobile ? "1.5rem" : "3rem");
  const paddingBottom = styles?.paddingBottom || (isMobile ? "1.5rem" : "3rem");

  // ── Navegación (misma función para flechas, swipe y autoplay) ──
  const navigate = useCallback(
    (dir: "left" | "right") => {
      if (!needsCarousel || isAnimating) return;
      setAnimDir(dir);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 320);
      setCurrentIndex((prev) =>
        dir === "right"
          ? (prev + 1) % galleryItems.length
          : (prev - 1 + galleryItems.length) % galleryItems.length
      );
    },
    [needsCarousel, isAnimating, galleryItems.length]
  );

  // Ref para que el temporizador siempre use la versión más reciente de navigate
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // ── Autoplay: avanza como la flecha derecha cada 5 s ──
  // Depende de currentIndex, así que cualquier cambio manual (flecha, swipe, dots)
  // reinicia la cuenta y no salta justo después de que el usuario interactúa.
  useEffect(() => {
    if (!needsCarousel || isPaused) return;
    const id = setTimeout(() => navigateRef.current("right"), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [needsCarousel, isPaused, currentIndex]);

  // ── Swipe táctil (pausa el autoplay mientras el dedo está sobre la galería) ──
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) > 45) navigate(diff < 0 ? "right" : "left");
  };

  // Pausa por hover solo con mouse (en táctil el hover emulado dejaría el autoplay pausado)
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setIsPaused(true);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setIsPaused(false);
  };

  if (!galleryItems.length) return null;

  // ── Items visibles (con su índice real para la numeración) ──
  const visibleItems: { item: GalleryItem; number: number }[] = [];
  for (let i = 0; i < effectiveCols; i++) {
    const realIndex = (currentIndex + i) % galleryItems.length;
    visibleItems.push({ item: galleryItems[realIndex], number: realIndex + 1 });
  }

  const showDots = galleryItems.length <= 10;

  const arrowBase =
    "absolute top-[36%] sm:top-[40%] -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-90";
  const arrowStyle: React.CSSProperties = {
    background: "rgba(10,10,10,0.78)",
    borderColor: "rgba(255,255,255,0.18)",
    color: "#fff",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
  };

  return (
    <section
      style={{ paddingTop, paddingBottom }}
      className="w-full flex flex-col items-center m-0 overflow-hidden"
    >
      {/* ── Título ── */}
      {title && (
        <div className="mb-8 sm:mb-10 px-4 text-center">
          <h2
            className="section-title"
            style={fieldStyles?.title || { color: "var(--text)" }}
          >
            {title}
          </h2>
          <div
            className="mx-auto mt-3 h-px w-14"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--accent, #AAA396), transparent)",
            }}
          />
        </div>
      )}

      {/* ── Contenedor principal ── */}
      <div
        className="w-full max-w-7xl mx-auto px-4 sm:px-14"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => setIsPaused(false)}
      >
        {/* Wrapper relativo: las flechas se posicionan respecto a las cards */}
        <div className="relative">
          {needsCarousel && (
            <button
              type="button"
              onClick={() => navigate("left")}
              aria-label="Anterior"
              className={`${arrowBase} left-2 sm:-left-[52px]`}
              style={arrowStyle}
            >
              <span className="material-icons-round" style={{ fontSize: 22 }}>
                chevron_left
              </span>
            </button>
          )}

          {needsCarousel && (
            <button
              type="button"
              onClick={() => navigate("right")}
              aria-label="Siguiente"
              className={`${arrowBase} right-2 sm:-right-[52px]`}
              style={arrowStyle}
            >
              <span className="material-icons-round" style={{ fontSize: 22 }}>
                chevron_right
              </span>
            </button>
          )}

          {/* ── Grid de cards ── */}
          <div
            key={currentIndex}
            className="grid items-stretch gap-4 sm:gap-5 lg:gap-7 w-full"
            style={{
              gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
              animation: `gallerySlide${animDir === "right" ? "Right" : "Left"} 0.32s cubic-bezier(.22,.8,.3,1)`,
            }}
          >
            {visibleItems.map(({ item, number }, idx) => (
              <GalleryCard
                key={`${currentIndex}-${idx}`}
                item={item}
                number={number}
                titleStyle={fieldStyles?.itemTitle}
                descriptionStyle={fieldStyles?.itemDescription}
              />
            ))}
          </div>
        </div>

        {/* ── Indicadores ── */}
        {needsCarousel && (
          <div className="flex justify-center items-center gap-2 mt-6 sm:mt-8">
            {showDots ? (
              Array.from({ length: galleryItems.length }).map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir a imagen ${i + 1}`}
                  onClick={() => {
                    setAnimDir(i > currentIndex ? "right" : "left");
                    setCurrentIndex(i);
                  }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentIndex ? 26 : 7,
                    height: 7,
                    background:
                      i === currentIndex
                        ? "var(--accent, #AAA396)"
                        : "var(--border, #CEC1A8)",
                    opacity: i === currentIndex ? 1 : 0.7,
                  }}
                />
              ))
            ) : (
              <span
                className="text-xs tracking-[0.25em] font-medium"
                style={{ color: "var(--text, #584738)" }}
              >
                {String(currentIndex + 1).padStart(2, "0")} /{" "}
                {String(galleryItems.length).padStart(2, "0")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes gallerySlideRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gallerySlideLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </section>
  );
}

// ────────────────────────────────────────────────
// Card individual: rectángulo negro que encierra imagen + razón
// ────────────────────────────────────────────────
function GalleryCard({
  item,
  number,
  titleStyle,
  descriptionStyle,
}: {
  item: GalleryItem;
  number: number;
  titleStyle?: React.CSSProperties;
  descriptionStyle?: React.CSSProperties;
}) {
  return (
    <article
      className="group relative h-full w-full mx-auto max-w-[420px] sm:max-w-none flex flex-col rounded-[1.75rem] p-3 sm:p-4 transition-all duration-500 hover:-translate-y-1.5 hover:border-[color:var(--accent,#AAA396)]"
      style={{
        background: "linear-gradient(160deg, #161616 0%, #000000 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 22px 50px -18px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      {/* Imagen */}
      <div
        className="relative w-full overflow-hidden rounded-2xl aspect-[4/5] sm:aspect-square"
        style={{ background: "#0d0d0d" }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title || "Imagen"}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="material-icons-round"
              style={{ fontSize: 44, color: "rgba(255,255,255,0.25)" }}
            >
              image
            </span>
          </div>
        )}

        {/* Degradado inferior */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
          }}
        />

        {/* Número tipo insignia */}
        <span
          className="absolute top-3 left-3 h-9 min-w-9 px-2 rounded-full flex items-center justify-center text-xs font-semibold tracking-widest"
          style={{
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.22)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {String(number).padStart(2, "0")}
        </span>

        {/* Marco interior fino en hover */}
        <div
          className="absolute inset-2 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ border: "1px solid rgba(255,255,255,0.45)" }}
        />
      </div>

      {/* Razón */}
      {(item.title || item.description) && (
        <div className="flex flex-col items-center text-center px-2 pt-5 pb-3 sm:pb-2 flex-1">
          <div
            className="h-px w-10 mb-4 transition-all duration-500 group-hover:w-16"
            style={{ background: "var(--accent, #AAA396)" }}
          />

          {item.title && (
            <h3
              className="text-base sm:text-lg font-semibold leading-snug tracking-tight"
              style={{ color: "#ffffff", ...(titleStyle || {}) }}
            >
              {item.title}
            </h3>
          )}

          {item.description && (
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)", ...(descriptionStyle || {}) }}
            >
              {item.description}
            </p>
          )}
        </div>
      )}
    </article>
  );
}