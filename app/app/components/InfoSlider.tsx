"use client";

import React, { useEffect, useRef, useState } from "react";

type SliderItem = string | { text: string; href?: string };

type InfoSliderProps = {
  items?: SliderItem[];
  intervalMs?: number;
};

export default function InfoSlider({ items = [], intervalMs = 5000 }: InfoSliderProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const len = items.length;

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (len <= 1) return;

    if (!pauseRef.current) {
      timerRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % len);
      }, intervalMs) as unknown as number;
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [len, intervalMs, isPaused]);

  useEffect(() => {
    // reset index if items changes and index out of bounds
    if (index >= len) setIndex(0);
  }, [len]);

  const prev = () => {
    pauseRef.current = true;
    setIsPaused(true);
    setIndex((i) => (i - 1 + len) % len);
    // resume after one interval
    window.setTimeout(() => { pauseRef.current = false; setIsPaused(false); }, intervalMs);
  };

  const next = () => {
    pauseRef.current = true;
    setIsPaused(true);
    setIndex((i) => (i + 1) % len);
    window.setTimeout(() => { pauseRef.current = false; setIsPaused(false); }, intervalMs);
  };

  if (len === 0) return null;

  return (
    <div
      className="w-full text-center py-3 font-medium bg-white text-body relative"
      onMouseEnter={() => { pauseRef.current = true; setIsPaused(true); }}
      onMouseLeave={() => { pauseRef.current = false; setIsPaused(false); }}
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center px-2">
        {len > 1 && (
          <button
            aria-label="Anterior"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-black hover:bg-black/10"
            onClick={prev}
            style={{ zIndex: 2 }}
          >
            <span className="material-icons-round text-xl">chevron_left</span>
          </button>
        )}

        <div
          className="flex-1 text-center text-black italic px-8"
          style={{
            maxWidth: "90%",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          } as React.CSSProperties}
        >
          {typeof items[index] === "string" ? (
            <span className="text-base sm:text-lg md:text-xl lg:text-xl wrap-break-word">{items[index]}</span>
          ) : (
            (() => {
              const it = items[index] as { text: string; href?: string };
              return it.href ? (
                <a
                  href={it.href}
                  className="text-base sm:text-lg md:text-xl lg:text-xl text-black hover:underline wrap-break-word"
                  style={{ display: "inline-block" }}
                >
                  {it.text}
                </a>
              ) : (
                <span className="text-base sm:text-lg md:text-xl lg:text-xl wrap-break-word">{it.text}</span>
              );
            })()
          )}
        </div>

        {len > 1 && (
          <button
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full text-black hover:bg-black/10"
            onClick={next}
            style={{ zIndex: 2 }}
          >
            <span className="material-icons-round text-xl">chevron_right</span>
          </button>
        )}
      </div>
    </div>
  );
}
