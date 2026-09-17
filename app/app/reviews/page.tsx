"use client";

import React, { useState, useEffect } from "react";
import { BusinessReview } from "../lib/business-reviews-types";
import { useUser } from "../context/UserContext";
import BottomBarPublic from "../components/BottomBarPublic";

export default function BusinessReviewsPage() {
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const { isLogged, user } = useUser();

  useEffect(() => {
    if (isLogged && user) {
      setReviewName(user.displayName || "");
      setReviewEmail(user.email || "");
    }
  }, [isLogged, user]);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/business-reviews", { cache: 'no-store' });
      if (res.ok) setReviews(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (showReviews) {
      fetchReviews();
    }
  }, [showReviews]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError("");
    if (!reviewRating || !reviewText) {
      setReviewError("Completa la calificación y el comentario");
      setReviewLoading(false);
      return;
    }
    if (!isLogged && (!reviewName || !reviewEmail)) {
      setReviewError("Completa nombre y correo para publicar la reseña");
      setReviewLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/business-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "",
          userName: reviewName || user?.displayName || "Usuario",
          userEmail: reviewEmail,
          rating: reviewRating,
          comment: reviewText,
        }),
      });
      if (res.ok) {
        setReviewText("");
        setReviewRating(0);
        if (!isLogged) { setReviewName(""); setReviewEmail(""); }
        fetchReviews();
      } else {
        setReviewError("Error al enviar reseña");
      }
    } catch {
      setReviewError("Error de red");
    }
    setReviewLoading(false);
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
    : 0;

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 transition-colors";

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white transition-colors">
      <BottomBarPublic/>

      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Reseñas de nuestro negocio
          </h1>
          <p className="text-sm text-white/60">
            Comparte tu experiencia con nosotros
          </p>
        </div>

        {/* Resumen */}
        {reviews.length > 0 && (
          <div className="mb-8 flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-center">
              <span className="text-5xl font-extrabold text-white leading-none">
                {avgRating.toFixed(1)}
              </span>
              <div className="flex gap-0.5 mt-2 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-2xl ${i < Math.round(avgRating) ? "text-yellow-400" : "text-white/10"}`}>★</span>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-2">
                {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1 h-px bg-white/10 hidden sm:block" />
            <p className="text-sm text-white/70">
              Gracias por confiar en nosotros. Tu opinión nos ayuda a mejorar cada día.
            </p>
          </div>
        )}

        {/* Formulario */}
        {!showReviews && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Escribe una reseña</h2>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-white/75">Nombre</label>
                  <input className={inputCls} placeholder="Tu nombre" value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)} required={!isLogged} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-white/75">Correo</label>
                  <input className={inputCls} placeholder="tu@correo.com" type="email" value={reviewEmail}
                    onChange={(e) => setReviewEmail(e.target.value)} required={!isLogged} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/80">Calificación</label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} onClick={() => setReviewRating(i + 1)} role="button"
                      aria-label={`Calificación ${i + 1}`}
                      className={`text-2xl cursor-pointer transition-transform hover:scale-110 select-none ${
                        i < reviewRating ? "text-yellow-400" : "text-white/10"
                      }`}>★</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/80">Comentario</label>
                <textarea className={`${inputCls} resize-none`} rows={3}
                  placeholder="Cuéntanos tu experiencia con nuestro negocio..." value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)} required />
              </div>

              {reviewError && (
                <p className="text-xs text-red-500">{reviewError}</p>
              )}

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowReviews(true)}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Mostrar reseñas
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reviewLoading ? "Publicando..." : "Publicar reseña"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de reseñas */}
        {showReviews && (
          <div className="space-y-4">
            {/* Botón volver */}
            <button
              onClick={() => setShowReviews(false)}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4"
            >
              <span className="material-icons-round text-lg">arrow_back</span>
              Volver a escribir reseña
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-white/40">
                <div className="w-8 h-8 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
                <span className="text-sm">Cargando reseñas...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <span className="material-icons-round text-5xl text-white/20">rate_review</span>
                <p className="text-white/60 font-medium">
                  Aún no hay reseñas. ¡Sé el primero en compartir tu experiencia!
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white/90">{r.userName}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < r.rating ? "text-yellow-400" : "text-white/10"}`}>★</span>
                        ))}
                      </div>
                      <span className="text-xs text-white/30 ml-auto">
                        {new Date(r.createdAt).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
