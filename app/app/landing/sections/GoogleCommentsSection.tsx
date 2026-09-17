"use client";


import React from "react";
import { Loading3DIcon } from "../../components/Loading3DIcon";
import Image from "next/image";
import type { LandingSectionStyles, LandingFieldStyle } from "../../lib/landing-types";

export type GoogleComment = {
  author_name: string;
  rating: number;
  text: string;
  time: string;
  profile_photo_url?: string;
};

export type GoogleCommentsSectionProps = {
  title?: string;
  comments?: GoogleComment[];
  styles?: LandingSectionStyles;
  fieldStyles?: Record<string, LandingFieldStyle>;
};

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rating ? "text-yellow-400" : "text-slate-300"}>
        <span className="material-icons-round">star</span>
      </span>
    );
  }
  return stars;
}

export default function GoogleCommentsSection({
  title,
  comments = [],
  styles,
  fieldStyles,
}: GoogleCommentsSectionProps) {
  // Log para depuración
  console.log("[GoogleCommentsSection] comments prop:", comments);
  const bg = styles?.backgroundColor;
  const color = styles?.textColor;
  const paddingTop = styles?.paddingTop || (typeof window !== "undefined" && window.innerWidth < 768 ? "1rem" : "2rem");
  const paddingBottom = styles?.paddingBottom || (typeof window !== "undefined" && window.innerWidth < 768 ? "1rem" : "2rem");
  const borderRadius = styles?.borderRadius || "1.5rem";

  // Show loading icon if comments is undefined (loading state)
  if (typeof window !== "undefined" && !comments) {
    return (
      <section className="flex justify-center items-center min-h-50">
        <Loading3DIcon type="box" />
      </section>
    );
  }

  return (
    <section
      style={{
        ...(bg ? { backgroundColor: bg } : {}),
        ...(color ? { color } : {}),
        paddingTop,
        paddingBottom,
      }}
      className="px-4 lg:px-6 m-0 dark:text-slate-100"
    >
      <div className="max-w-4xl mx-auto" style={{ borderRadius }}>
        {title && (
          <h2 className="section-title mb-6 text-center" style={{ fontSize: "40px" }}>
            {title}
          </h2>
        )}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {Array.isArray(comments) && comments.length > 0 ? (
            comments.map((c, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow border border-slate-200 dark:border-slate-700">
                <div className="flex items-center mb-2">
                  {c.profile_photo_url && c.profile_photo_url !== "" ? (
                    <Image
                      src={c.profile_photo_url}
                      alt={c.author_name}
                      width={40}
                      height={40}
                      className="rounded-full mr-3 border border-slate-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-300">
                      <span className="material-icons-round">person</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-base">{c.author_name}</span>
                    <span className="text-xs text-slate-500">{c.time}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={i <= c.rating ? "text-yellow-400" : "text-slate-300"}>
                        <span className="material-icons-round">star</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-200 mb-2 mt-2">{c.text}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No hay comentarios seleccionados.</div>
          )}
        </div>
      </div>
    </section>
  );
}

