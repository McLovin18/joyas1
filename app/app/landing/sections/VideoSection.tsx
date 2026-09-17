"use client";

import React from "react";

export type VideoSectionProps = {
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  styles?: any;
};

export default function VideoSection({
  videoUrl = "/video.mp4",
  title = "",
  subtitle = "",
  styles,
}: VideoSectionProps) {
  return (
    <section
      className="w-full overflow-hidden"
      style={{ background: "var(--background)", ...styles }}
    >
      {/* Títulos opcionales */}
      {(title || subtitle) && (
        <div className="text-center py-4 px-4">
          {title && (
            <h2 className="section-title text-slate-900 dark:text-white mb-2">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="section-subtitle page-lead text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Video Full Width Responsive */}
      <div className="w-screen">
        <video
          className="
            w-full 
            object-cover 
            h-[32vh]
            sm:h-[38vh]
            md:h-[50vh]
            lg:h-[48vh]
          "
          style={{
            minHeight: "220px",
            maxHeight: "650px",
            display: "block",
          }}
          controls
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={videoUrl} type="video/mp4" />
          Tu navegador no soporta el elemento de video.
        </video>
      </div>
    </section>
  );
}