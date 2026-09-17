/**
 * 📊 ANALYTICS WIDGET
 * Beautiful analytics dashboard for admin page
 * Shows page views, clicks, and interactions
 */

"use client";

import React, { useEffect, useState } from "react";
import { getTodayAnalytics } from "../lib/analytics-db";

interface Analytics {
  visits: number;
  totalClicks: number;
  clicksByType?: {
    productClick: number;
    categoryClick: number;
    buttonClick: number;
    linkClick: number;
    blogClick: number;
    [key: string]: number;
  };
}

export default function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getTodayAnalytics();
        setAnalytics(
          (data as any)
            ? ({
                visits: Number((data as any).visits ?? (data as any).uniqueVisitors ?? 0),
                totalClicks: Number((data as any).totalClicks ?? 0),
                clicksByType: (data as any).clicksByType || {},
              } as Analytics)
            : { visits: 0, totalClicks: 0, clicksByType: {} }
        );
        setError(null);
      } catch (err) {
        setError("Error cargando analytics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    // Reload analytics every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8 border border-purple-100 dark:border-slate-700 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center animate-pulse">
            <span className="material-icons-round text-purple-600 dark:text-purple-400">
              show_chart
            </span>
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
      </div>
    );
  }

  const clicks = analytics?.clicksByType || {
    productClick: 0,
    categoryClick: 0,
    buttonClick: 0,
    linkClick: 0,
    blogClick: 0,
  };

  const engagementScore = Math.min(
    100,
    Math.round(
      (analytics?.totalClicks || 0) / Math.max(1, analytics?.visits || 1) * 100
    )
  );

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
          <span className="material-icons-round text-white">
            show_chart
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Análisis del Día
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unique Visitors Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/50 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-1">
                Sesiones
              </p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                {analytics?.visits || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-icons-round text-2xl text-blue-600 dark:text-blue-300">
                people
              </span>
            </div>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Entradas contadas por sesi\u00f3n
          </p>
        </div>

        {/* Total Clicks Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700/50 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-300 mb-1">
                Clicks
              </p>
              <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                {analytics?.totalClicks || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="material-icons-round text-2xl text-purple-600 dark:text-purple-300">
                touch_app
              </span>
            </div>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Interacciones totales en la página
          </p>
        </div>
      </div>

      {/* Engagement Score */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-700/50 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-300 mb-1">
              Indicador de Engagement
            </p>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {engagementScore}%
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">{engagementScore}%</span>
          </div>
        </div>
        <div className="w-full bg-amber-200 dark:bg-amber-700/30 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${engagementScore}%` }}
          ></div>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
          {engagementScore < 20
            ? "Bajo engagement - Considera revisar el contenido"
            : engagementScore < 50
              ? "Engagement moderado - Hay oportunidad de mejora"
              : engagementScore < 80
                ? "Buen engagement - ¡Los usuarios están interactuando!"
                : "Excelente engagement - ¡Los usuarios aman tu sitio!"}
        </p>
      </div>

      {/* Click Breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-md">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <span className="material-icons-round text-purple-600 dark:text-purple-400">
            gesture
          </span>
          Desglose de Interacciones
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { type: "productClick", label: "Productos", icon: "shopping_cart", color: "blue" },
            { type: "categoryClick", label: "Categorías", icon: "category", color: "green" },
            { type: "buttonClick", label: "Botones", icon: "smart_button", color: "orange" },
            { type: "blogClick", label: "Blogs", icon: "article", color: "indigo" },
            { type: "linkClick", label: "Enlaces", icon: "link", color: "pink" },
          ].map((item) => (
            <div
              key={item.type}
              className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-lg p-4 border border-${item.color}-200 dark:border-${item.color}-700/50 text-center`}
            >
              <div
                className={`flex justify-center mb-2 text-${item.color}-600 dark:text-${item.color}-300`}
              >
                <span className="material-icons-round text-2xl">{item.icon}</span>
              </div>
              <p
                className={`text-2xl font-bold text-${item.color}-900 dark:text-${item.color}-100 mb-1`}
              >
                {clicks[item.type] || 0}
              </p>
              <p
                className={`text-xs text-${item.color}-600 dark:text-${item.color}-400`}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700/50 flex gap-3">
        <span className="material-icons-round text-blue-600 dark:text-blue-400 flex-shrink-0">
          info
        </span>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Los datos se reinician diariamente alrededor de las 11 PM. Esta sección se actualiza cada 30 segundos.
        </p>
      </div>
    </div>
  );
}

