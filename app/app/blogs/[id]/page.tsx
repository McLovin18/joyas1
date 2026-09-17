"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { redirectIfLoggedIn } from "../../lib/firebase-auth";
import { getBlogById } from "../../lib/blogs-db";
import type { Blog } from "../../lib/blog-types";
import BlogPreview from "../BlogPreview";

export default function BlogDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function load() {
      if (!params?.id) return;
      setLoading(true);
      const data = await getBlogById(params.id as string);
      setBlog(data);
      setLoading(false);
    }
    load();
  }, [params?.id]);

  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
      }}
      className="min-h-screen flex flex-col"
    >
      <main className="max-w-3xl mx-auto px-4 py-8 lg:px-6 flex-1 w-full">
        {loading ? (
          <div className="text-center py-16">
            <span
              className="material-icons-round animate-spin text-4xl"
              style={{ color: "var(--textSecondary)" }}
            >
              sync
            </span>
            <p className="mt-4" style={{ color: "var(--textSecondary)" }}>
              Cargando artículo...
            </p>
          </div>
        ) : !blog ? (
          <div className="text-center py-16">
            <span
              className="material-icons-round text-6xl opacity-30"
              style={{ color: "var(--textSecondary)" }}
            >
              article
            </span>
            <h2 className="text-2xl font-bold mt-4" style={{ color: "var(--text)" }}>
              Artículo no encontrado
            </h2>
          </div>
        ) : (
          <BlogPreview blog={blog} device="desktop" />
        )}
      </main>
    </div>
  );
}
