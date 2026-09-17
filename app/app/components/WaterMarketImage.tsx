"use client";
import React, { useEffect, useRef, useState } from "react";

type WatermarkedImageProps = {
  src: string;
  watermarkSrc?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  objectFit?: "cover" | "contain";
  watermarkRatio?: number; // % del ancho de la imagen que ocupa el watermark (desktop)
  watermarkRatioMobile?: number; // % del ancho de la imagen que ocupa el watermark (móvil)
  mobileBreakpoint?: number; // px: por debajo de este ancho de pantalla se considera "móvil"
};

export default function WatermarkedImage({
  src,
  watermarkSrc,
  alt = "",
  className = "",
  imgClassName = "",
  objectFit = "contain",
  watermarkRatio = 0.22,
  watermarkRatioMobile = 0.34,
  mobileBreakpoint = 768,
}: WatermarkedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setFinalSrc(null);

    if (!src) return;

    // Sin marca de agua: usamos la imagen tal cual, sin pasar por canvas
    if (!watermarkSrc) {
      setFinalSrc(src);
      return;
    }

    async function loadImage(url: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // necesario para no "manchar" el canvas
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }

    (async () => {
      try {
        const [baseImg, wmImg] = await Promise.all([
          loadImage(src),
          loadImage(watermarkSrc),
        ]);
        if (cancelled) return;

        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = baseImg.naturalWidth;
        canvas.height = baseImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No se pudo obtener contexto de canvas");

        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

        // En pantallas angostas (móvil) usamos un ratio más grande para que
        // la marca de agua siga siendo legible al verse más pequeña en pantalla
        const isMobileViewport =
          typeof window !== "undefined" && window.innerWidth < mobileBreakpoint;
        const effectiveRatio = isMobileViewport ? watermarkRatioMobile : watermarkRatio;

        const wmWidth = canvas.width * effectiveRatio;
        const wmHeight = (wmImg.naturalHeight / wmImg.naturalWidth) * wmWidth;
        const marginX = canvas.width * 0.05;   // más espacio desde el borde derecho
        const marginY = canvas.height * 0.05;  // más espacio desde el borde inferior
        ctx.drawImage(
          wmImg,
          canvas.width - wmWidth - marginX,
          canvas.height - wmHeight - marginY,
          wmWidth,
          wmHeight
        );

        const dataUrl = canvas.toDataURL("image/png");
        if (!cancelled) setFinalSrc(dataUrl);
      } catch (err) {
        console.error("Error generando imagen con marca de agua:", err);
        if (!cancelled) {
          setError(true);
          setFinalSrc(src); // fallback: mostrar la imagen sin watermark antes que romper la UI
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, watermarkSrc, watermarkRatio, watermarkRatioMobile, mobileBreakpoint]);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {finalSrc ? (
        <img
          src={finalSrc}
          alt={alt}
          className={imgClassName || className}
          style={{ objectFit }}
        />
      ) : (
        <div className={className} />
      )}
    </>
  );
}