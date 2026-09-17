"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBlogById } from "../../../lib/blogs-db";
import type { Blog } from "../../../lib/blog-types";
import BlogPreview from "../../../blogs/BlogPreview";

export default function AdminBlogDetailPage() {
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950">
      <div className="flex-1 w-full px-4 pt-4 py-6 sm:py-12 pb-24 flex justify-center">
        <div className="w-full max-w-3xl">
          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Cargando artículo...
            </div>
          ) : !blog ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Artículo no encontrado.
            </div>
          ) : (
            <BlogPreview blog={blog} device="desktop" />
          )}
        </div>
      </div>
    </div>
  );
}
