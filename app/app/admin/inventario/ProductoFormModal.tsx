"use client";
import React from "react";
import ProductoForm from "./ProductoForm";

export default function ProductoFormModal({ show, onClose, initialData, onSave }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/80 via-black/70 to-slate-900/90 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl mx-2 relative animate-fade-in border-4 border-purple-700/60 flex flex-col"
        style={{
          maxHeight: '98vh',
          minHeight: 'min(94vh, 500px)',
        }}
      >
        <button
          className="absolute top-3 right-3 text-3xl text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-white font-bold transition z-10"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className="overflow-y-auto p-4 md:p-8 flex-1 w-full scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
          <h2 className="text-2xl md:text-3xl font-extrabold text-purple-800 dark:text-purple-300 mb-6 flex items-center gap-2">
            <span className="inline-block bg-purple-100 dark:bg-purple-900 rounded-full p-2">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V18a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-3.26A6.98 6.98 0 0 1 5 9a7 7 0 0 1 7-7Zm0 2a5 5 0 0 0-5 5c0 1.7.85 3.2 2.15 4.1l.85.6V18h4v-7.3l.85-.6A5 5 0 0 0 17 9a5 5 0 0 0-5-5Z"/></svg>
            </span>
            {initialData ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <ProductoForm
            initialData={initialData}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 900px) {
          .max-w-5xl {
            max-width: 120vw !important;
          }
        }
        @media (max-width: 640px) {
          .max-w-4xl {
            max-width: 100vw !important;
          }
          .rounded-3xl {
            border-radius: 1.2rem !important;
          }
        }
        @media (max-width: 480px) {
          .p-8, .md\:p-8 {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

