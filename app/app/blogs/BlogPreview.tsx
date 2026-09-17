"use client";

import React from "react";
import Image from "next/image";
import type { Blog, BlogBlock } from "../lib/blog-types";

export type BlogPreviewProps = {
  blog: Blog;
  device: "desktop" | "mobile";
};

function renderBlock(block: BlogBlock, index: number) {
  if (block.type === "subtitle") {
    const style: React.CSSProperties = {
      color: block.style?.color,
      fontSize: block.style?.fontSize,
      fontWeight: (block.style?.fontWeight as any) || "600",
      textDecoration: block.style?.textDecoration,
    };
    return (
      <h2
        key={block.id || index}
        className="font-semibold mt-8 mb-4 text-slate-900 dark:text-white scroll-m-20"
        style={style}
      >
        {block.text}
      </h2>
    );
  }
  
  if (block.type === "paragraph") {
    const style: React.CSSProperties = {
      color: block.style?.color,
      fontSize: block.style?.fontSize,
      paddingBlock: block.style?.paddingBlock,
      backgroundColor: block.style?.backgroundColor,
    };
    return (
      <p
        key={block.id || index}
        className="text-base leading-7 mb-6 text-slate-700 dark:text-slate-300"
        style={style}
      >
        {block.text}
      </p>
    );
  }
  
  if (block.type === "image") {
    const style: React.CSSProperties = {
      borderRadius: block.style?.borderRadius,
      padding: block.style?.paddingBlock,
    };
    return (
      <figure
        key={block.id || index}
        className="my-8 flex flex-col items-center"
        style={style}
      >
        {block.url && (
          <Image
            src={block.url}
            alt={block.alt || "Imagen del blog"}
            width={800}
            height={400}
            className="w-full rounded-lg max-h-96 object-cover shadow-md"
            sizes="(max-width: 768px) 100vw, 800px"
            loading="lazy"
          />
        )}
        {block.caption && (
          <figcaption className="mt-3 text-sm text-slate-500 dark:text-slate-400 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  
  return null;
}

export default function BlogPreview({ blog, device }: BlogPreviewProps) {
  const wrapperClass =
    device === "mobile"
      ? "w-[390px] max-w-full mx-auto px-4 py-8"
      : "w-full max-w-3xl mx-auto px-4 py-12 lg:px-0";

  return (
    <article className={wrapperClass}>
      <header className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white leading-tight">
          {blog.title || "(Sin título)"}
        </h1>
        {blog.description && (
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {blog.description}
          </p>
        )}
      </header>
      
      <section className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        {Array.isArray(blog.blocks) && blog.blocks.length > 0 ? (
          blog.blocks.map(renderBlock)
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No hay contenido disponible en este blog.
            </p>
          </div>
        )}
      </section>
    </article>
  );
}

