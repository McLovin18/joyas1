"use client";

import React from "react";
import type { HeroGoogleReview, LandingSectionStyles, LandingFieldStyle } from "../../lib/landing-types";

export type HeroGoogleReviewSectionProps = HeroGoogleReview;

export default function HeroGoogleReviewSection({
  title,
  subtitle,
  badge,
  buttonText,
  buttonLink,
  image,
  styles,
  fieldStyles,
  rating,
  ratingCount,
  generalMessage,
}: HeroGoogleReviewSectionProps) {
  const bg = styles?.backgroundColor;
  const color = styles?.textColor;
  const paddingTop = styles?.paddingTop || "3rem";
  const paddingBottom = styles?.paddingBottom || "3rem";
  const textAlign: React.CSSProperties["textAlign"] = styles?.textAlign || "left";
  const borderRadius = styles?.borderRadius || "1.5rem";

  const badgeStyle: React.CSSProperties | undefined = fieldStyles?.badge || {};
  const titleStyle: React.CSSProperties | undefined = fieldStyles?.title || {};
  const subtitleStyle: React.CSSProperties | undefined = fieldStyles?.subtitle || {};
  const buttonTextStyle: React.CSSProperties | undefined = fieldStyles?.buttonText || {};

  return (
    <section
      style={{
        ...(bg ? { backgroundColor: bg } : {}),
        ...(color ? { color } : {}),
        paddingTop,
        paddingBottom,
        textAlign,
      }}
      className="px-4 lg:px-6 dark:text-slate-100"
    >
      <div
        className="relative overflow-hidden aspect-4/5 lg:aspect-video bg-slate-200 dark:bg-neutral-900 group max-w-full"
        style={{ borderRadius }}
      >
        {image && (
          <img
            src={image}
            alt={title || "Hero"}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col items-center text-center">
          {badge && (
            <span
              className="section-eyebrow inline-block px-3 py-1 mb-4 text-[10px] bg-white text-black dark:bg-slate-900 dark:text-white rounded-full"
              style={badgeStyle}
            >
              {badge}
            </span>
          )}
          {title && (
            <h2
              className="section-title text-white mb-4 leading-tight max-w-3xl"
              style={titleStyle}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className="section-subtitle page-lead text-slate-300 mb-6 max-w-xl"
              style={subtitleStyle}
            >
              {subtitle}
            </p>
          )}
          {/* Calificación de Google Maps */}
          {typeof rating === "number" && (
            <div className="flex items-center justify-center mb-4">
              <span className="text-yellow-400 text-2xl font-bold mr-2">{rating.toFixed(1)}</span>
              <span className="material-icons-round text-yellow-400">star</span>
              {ratingCount && (
                <span className="ml-2 text-white text-sm">({ratingCount} reseñas)</span>
              )}
            </div>
          )}
          {generalMessage && (
            <div className="mb-4 text-white text-base font-medium">{generalMessage}</div>
          )}
          {buttonText && (
            <a
              href={buttonLink || "/products-by-category"}
              className="inline-flex items-center justify-center gap-2 py-4 px-6 bg-white text-black dark:bg-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform whitespace-nowrap"
              style={buttonTextStyle}
            >
              <span>{buttonText}</span>
              <span className="material-icons-round text-sm">arrow_forward</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

