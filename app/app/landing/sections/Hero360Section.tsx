"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LandingSectionStyles, LandingFieldStyle } from "../../lib/landing-types";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export type Hero360SectionProps = {
  heading?: string;
  subheading?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonLink?: string;
  backgroundImage?: string;
  images?: string[];
  autoPlay?: boolean;
  interval?: number;
  onPrimaryButtonClick?: () => void;
};

export default function Hero360Section({
  heading = "CONSTRUYE TU",
  subheading = "NUEVO EQUIPO",
  description = "Arma tu PC soñada. Nosotros te asesoramos para que juegues sin límites.",
  primaryButtonText = "ENSAMBLES",
  secondaryButtonText = "ASESORAMIENTO",
  primaryButtonLink = "/products-by-category?cat=1775935501638&sub=1775935523162",
  secondaryButtonLink,
  backgroundImage = "/banner_img.jpeg",
  images = [
    "/img_1.png",
    "/img_2.png",
    "/img_3.png",
    "/img_4.png",
  ],
  autoPlay = true,
  interval = 2000,
  onPrimaryButtonClick,
}: Hero360SectionProps) {
  const { settings } = useSiteSettings();
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bgImage, setBgImage] = useState("/banner_img.jpeg");

  // Usar el número de WhatsApp configurado si no se proporciona un link específico
  const whatsappLink = secondaryButtonLink || (settings.whatsappNumber 
    ? `https://wa.me/${settings.whatsappNumber}?text=Hola%20quiero%20asesoramiento%20para%20mi%20PC`
    : "https://wa.me/593962873167?text=Hola%20quiero%20asesoramiento%20para%20mi%20PC"
  );

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Detectar si está en dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(hasDarkClass || prefersDark);

    // Escuchar cambios de tema
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Parsear imágenes si vienen como string
  let parsedImages: string[] = Array.isArray(images)
    ? images
    : typeof images === "string"
    ? images
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : [];

  if (parsedImages.length === 0) {
    parsedImages = ["/img_1.png", "/img_2.png", "/img_3.png", "/img_4.png"];
  }

  return (
    <section
      className="w-full relative overflow-hidden hero-360-section "
      style={{
        minHeight: isMobile ? "700px" : "800px",
        position: "relative",
      }}
    >
      {/* Background Image - responsive según dispositivo */}
      <img
        src="/banner_img.jpeg"
        alt="Background"
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: isMobile ? "700px" : "800px",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          display: "block",
          padding: "10px"
        }}
      />

      {/* Overlay para oscurecer ligeramente */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark
            ? "radial-gradient(circle at center, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.5) 100%)"
            : "radial-gradient(circle at center, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 w-full h-full">
        <div
          className="w-full h-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? "30px" : "40px",
            alignItems: "center",
            minHeight: isMobile ? "700px" : "800px",
            paddingTop: isMobile ? "40px" : "60px",
            paddingBottom: isMobile ? "40px" : "60px",
          }}
        >
          {/* IZQUIERDA - Viewer 360 */}
          <div
            className="flex justify-center"
            style={{
              animation: "slideInLeft 0.8s ease-out",
            }}
          >
            <div
              style={{
                width: isMobile ? "280px" : "400px",
                height: isMobile ? "280px" : "400px",
                filter: isDark
                  ? "drop-shadow(0 25px 50px rgba(37, 99, 235, 0.25))"
                  : "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15))",
                borderRadius: "16px",
                overflow: "hidden",
                border: isDark
                  ? "1px solid rgba(59, 130, 246, 0.2)"
                  : "",
              }}
            >
              <Product360Viewer
                images={parsedImages}
                autoPlay={autoPlay}
                interval={interval}
              />
            </div>
          </div>

          {/* DERECHA - Contenido */}
          <div
            className="space-y-3 md:space-y-4"
            style={{
              animation: "slideInRight 0.8s ease-out",
            }}
          >
            {/* Heading */}
            <div>
              <p
                className="section-eyebrow text-lg md:text-3xl tracking-widest"
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: "1px",
                  textTransform: "uppercase",
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
                }}
              >
                {heading}
              </p>
              <h2
                className="section-title text-3xl md:text-4xl lg:text-5xl leading-tight"
                style={{
                  color: "rgba(255, 255, 255, 0.95)",
                  textShadow: "0 2px 12px rgba(0, 0, 0, 0.6)",
                }}
              >
                {subheading}
              </h2>
            </div>

            {/* Descripción */}
            <p
              className="section-subtitle page-lead text-base md:text-lg leading-relaxed"
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                maxWidth: "500px",
                lineHeight: "1.7",
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.4)",
              }}
            >
              {description}
            </p>

            {/* Botones */}
            <div
              className="flex flex-col sm:flex-row gap-4 pt-2"
              style={{
                animation: "slideInUp 0.8s ease-out 0.2s backwards",
              }}
            >
              {/* Botón Primario - ENSAMBLES */}
              <button
                onClick={() => {
                  if (onPrimaryButtonClick) {
                    onPrimaryButtonClick();
                  } else {
                    window.location.href = primaryButtonLink || "/products-by-category?cat=1775935501638&sub=1775935523162";
                  }
                }}
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-base md:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 text-body-bold"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #E0A11A 0%, #6d5fdf 100%)"
                    : "linear-gradient(135deg, #E0A11A 0%, #6d5fdf 100%)",
                  color: "white",
                  boxShadow: isDark
                    ? "0 12px 35px rgba(123, 104, 238, 0.35)"
                    : "0 12px 35px rgba(123, 104, 238, 0.35)",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {primaryButtonText}
              </button>

              {/* Botón Secundario - ASESORAMIENTO */}
              <a
                href={secondaryButtonLink}
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg text-base md:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 text-body-bold"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDark ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
                  border: isDark
                    ? "2px solid rgba(255, 255, 255, 0.2)"
                    : "2px solid rgba(15, 23, 42, 0.2)",
                  cursor: "pointer",
                  textDecoration: "none",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  backdropFilter: "blur(10px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(255, 255, 255, 0.95)";
                  e.currentTarget.style.borderColor = isDark
                    ? "rgba(99, 102, 241, 0.5)"
                    : "rgba(59, 130, 246, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.borderColor = isDark
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(15, 23, 42, 0.2)";
                }}
              >
                {secondaryButtonText}
              </a>
            </div>

           

          </div>
        </div>
      </div>

      {/* Responsive Fix for Mobile - SOLO PARA HERO360 */}
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .hero-360-section {
            min-height: 700px !important;
          }
          
          .hero-360-section > div > div {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
            padding-top: 40px !important;
            padding-bottom: 40px !important;
            min-height: 700px !important;
          }

          .hero-360-section h2 {
            font-size: 2rem !important;
          }
        }
      `}</style>
    </section>
  );
}

