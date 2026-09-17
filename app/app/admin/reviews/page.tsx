"use client";
import React, { useEffect, useState } from "react";
import { ProductReview } from "@/app/lib/reviews-types";
import { BusinessReview } from "@/app/lib/business-reviews-types";

type ReviewType = "product" | "business";

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<ReviewType>("business");
  const [productPending, setProductPending] = useState<ProductReview[]>([]);
  const [businessPending, setBusinessPending] = useState<BusinessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, [activeTab]);

  async function fetchPending() {
    console.log("[AdminReviewsPage] fetchPending called for", activeTab);
    setLoading(true);
    setError("");
    try {
      const endpoint = activeTab === "product" 
        ? "/api/reviews/pending" 
        : "/api/business-reviews/pending";
      console.log("[AdminReviewsPage] Fetching", endpoint, "...");
      const res = await fetch(endpoint, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      console.log("[AdminReviewsPage] Response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[AdminReviewsPage] Got data, reviews:", data.length);
        if (activeTab === "product") {
          setProductPending(data);
        } else {
          setBusinessPending(data);
        }
      } else {
        console.error("[AdminReviewsPage] Error response:", res.status);
        setError("Error al cargar reseñas");
      }
    } catch (err) {
      console.error("[AdminReviewsPage] Catch error:", err);
      setError("Error de red");
    }
    setLoading(false);
  }

  async function handleApprove(id: string) {
    setActionLoading(id + "_approve");
    try {
      console.log("[AdminReviewsPage] Approve called for id:", id);
      const endpoint = activeTab === "product"
        ? `/api/reviews/approve?id=${id}`
        : `/api/business-reviews/approve?id=${id}`;
      const res = await fetch(endpoint, { method: "POST", cache: 'no-store' });
      console.log("[AdminReviewsPage] Approve response status:", res.status);
      const body = await res.json().catch(() => null);
      console.log("[AdminReviewsPage] Approve response body:", body);
      if (res.ok) {
        if (activeTab === "product") {
          setProductPending((prev) => prev.map((r) => (r.id === id ? ({ ...r, approved: true } as any) : r)));
        } else {
          setBusinessPending((prev) => prev.map((r) => (r.id === id ? ({ ...r, approved: true } as any) : r)));
        }
      } else if (res.status === 404) {
        console.warn("[AdminReviewsPage] Approve returned 404, removing from UI", id);
        if (activeTab === "product") {
          setProductPending((prev) => prev.filter((r) => r.id !== id));
        } else {
          setBusinessPending((prev) => prev.filter((r) => r.id !== id));
        }
      }
    } catch (err) {
      console.error("[AdminReviewsPage] Approve error:", err);
    }
    setActionLoading(null);
    fetchPending();
  }

  async function handleReject(id: string) {
    setActionLoading(id + "_reject");
    try {
      console.log("[AdminReviewsPage] Reject called for id:", id);
      const endpoint = activeTab === "product"
        ? `/api/reviews/reject?id=${id}`
        : `/api/business-reviews/reject?id=${id}`;
      const res = await fetch(endpoint, { method: "POST", cache: 'no-store' });
      console.log("[AdminReviewsPage] Reject response status:", res.status);
      const body = await res.json().catch(() => null);
      console.log("[AdminReviewsPage] Reject response body:", body);
      if (res.ok) {
        if (activeTab === "product") {
          setProductPending((prev) => prev.filter((r) => r.id !== id));
        } else {
          setBusinessPending((prev) => prev.filter((r) => r.id !== id));
        }
      } else if (res.status === 404) {
        console.warn("[AdminReviewsPage] Reject returned 404, removing from UI", id);
        if (activeTab === "product") {
          setProductPending((prev) => prev.filter((r) => r.id !== id));
        } else {
          setBusinessPending((prev) => prev.filter((r) => r.id !== id));
        }
      }
    } catch (err) {
      console.error("[AdminReviewsPage] Reject error:", err);
    }
    setActionLoading(null);
    fetchPending();
  }

  const pending = activeTab === "product" ? productPending : businessPending;

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-base ${i < rating ? "text-yellow-400" : "text-slate-300 dark:text-slate-600"}`}
        >
          ★
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#2d1248] transition-colors ">
      <div className="max-w-4xl mx-auto py-6 sm:py-12 md:p-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-purple-100 dark:bg-purple-900/40 p-2.5 rounded-xl">
            <span className="material-icons-round text-purple-600 dark:text-purple-300 text-2xl">
              rate_review
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">
              Reseñas pendientes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aprueba o rechaza las reseñas antes de publicarlas
            </p>
          </div>
          {!loading && (
            <span className="ml-auto bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
              {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab("product")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "product"
                ? "bg-purple-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "business"
                ? "bg-purple-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Negocio
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando reseñas...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="material-icons-round text-base">error_outline</span>
            {error}
            <button
              onClick={fetchPending}
              className="ml-auto underline font-semibold hover:text-red-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista vacía */}
        {!loading && !error && pending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="material-icons-round text-5xl text-slate-300 dark:text-slate-600">
              check_circle
            </span>
            <p className="text-slate-400 dark:text-slate-500 font-medium">
              No hay reseñas pendientes de aprobación
            </p>
          </div>
        )}

        {/* Cards de reseñas */}
        {!loading && pending.length > 0 && (
          <ul className="space-y-4">
            {pending.map((r) => (
              <li
                key={r.id}
                className="bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Franja superior de color */}
                <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

                <div className="p-5">
                  {/* Cabecera */}
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    {/* Avatar inicial */}
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-700 dark:text-purple-300 font-bold text-base">
                        {r.userName?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate">
                          {r.userName}
                        </span>
                        <StarDisplay rating={r.rating} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-0.5">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="material-icons-round text-xs">calendar_today</span>
                          {new Date(r.createdAt).toLocaleDateString("es-EC", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {activeTab === "product" && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="material-icons-round text-xs">inventory_2</span>
                            Producto: {" "}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {(r as any).productName ? (r as any).productName : (r as any).productId}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email si existe */}
                    {r.userEmail && (
                      <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                        {r.userEmail}
                      </span>
                    )}
                  </div>

                  {/* Comentario */}
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-xl px-4 py-3 mb-4 border border-slate-100 dark:border-slate-700">
                    "{r.comment}"
                  </p>

                  {/* Acciones */}
                  <div className="flex gap-2 justify-end">
                    { (r as any).approved ? (
                      <span className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                        <span className="material-icons-round text-base">check</span>
                        Aprobada
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 dark:bg-red-900/20 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:border-red-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === r.id + "_reject" ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-icons-round text-base">close</span>
                          )}
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === r.id + "_approve" ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-icons-round text-base">check</span>
                          )}
                          Aprobar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
