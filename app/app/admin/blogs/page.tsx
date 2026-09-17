"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllBlogsAdmin } from "../../lib/blogs-db";
import type { Blog } from "../../lib/blog-types";

export default function AdminBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getAllBlogsAdmin();
      setBlogs(data);
      setLoading(false);
    }
    load();
  }, []);

  const featured = blogs.find((b) => b.featured);
  const others = blogs.filter((b) => !b.featured);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950">
      <div className="flex-1 w-full py-6 sm:py-12 px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Blogs
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Vista rápida de todos los blogs creados.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/edit-blogs")}
            className="inline-flex items-center gap-1 rounded-full bg-purple-600 text-white px-4 py-2 text-xs font-semibold hover:bg-purple-700"
          >
            <span className="material-icons-round text-sm">edit</span>
            Ir al editor
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Cargando blogs...
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No hay blogs creados todavía.
          </div>
        ) : (
          <div className="space-y-8">
            {featured && (
              <section>
                <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
                  Blog destacado
                </h2>
                <article
                  onClick={() => router.push(`/admin/blogs/${featured.id}`)}
                  className="rounded-2xl border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-900 p-5 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold">{featured.title}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-[11px] font-semibold">
                      <span className="material-icons-round text-xs">star</span>
                      Destacado
                    </span>
                  </div>
                  {featured.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 line-clamp-3">
                      {featured.description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300 mt-1">
                    <span className="material-icons-round text-sm">visibility</span>
                    Ver completo
                  </span>
                </article>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
                  Todos los blogs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {others.map((b) => (
                    <article
                      key={b.id}
                      onClick={() => router.push(`/admin/blogs/${b.id}`)}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
                    >
                      <h3 className="text-sm font-semibold mb-1">{b.title}</h3>
                      {b.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 line-clamp-3">
                          {b.description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full border ${
                            b.status === "published"
                              ? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
                              : "border-slate-400 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {b.status === "published" ? "Publicado" : "Borrador"}
                        </span>
                        {b.featured && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                            <span className="material-icons-round text-xs">star</span>
                            Destacado
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

