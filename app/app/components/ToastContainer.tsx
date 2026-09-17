"use client";

import React from "react";
import { useToast, Toast } from "../context/ToastContext";

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return (
          <span className="material-icons-round text-lg text-green-500">
            check_circle
          </span>
        );
      case "error":
        return (
          <span className="material-icons-round text-lg text-red-500">
            error
          </span>
        );
      case "warning":
        return (
          <span className="material-icons-round text-lg text-yellow-500">
            warning
          </span>
        );
      default:
        return (
          <span className="material-icons-round text-lg text-blue-500">
            info
          </span>
        );
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30",
          border: "border-green-200 dark:border-green-700/50",
          text: "text-green-900 dark:text-green-100",
        };
      case "error":
        return {
          bg: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30",
          border: "border-red-200 dark:border-red-700/50",
          text: "text-red-900 dark:text-red-100",
        };
      case "warning":
        return {
          bg: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30",
          border: "border-yellow-200 dark:border-yellow-700/50",
          text: "text-yellow-900 dark:text-yellow-100",
        };
      default:
        return {
          bg: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30",
          border: "border-blue-200 dark:border-blue-700/50",
          text: "text-blue-900 dark:text-blue-100",
        };
    }
  };

  return (
    <div className="fixed top-25 right-4 flex flex-col gap-3 pointer-events-none z-50 max-w-sm">
      {toasts.map((toast: Toast) => {
        const styles = getStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`
              ${styles.bg}
              ${styles.border}
              ${styles.text}
              border
              rounded-lg p-4
              shadow-lg
              flex items-center gap-3
              animate-in slide-in-from-top-5 fade-in duration-300
              pointer-events-auto
              backdrop-blur-sm
            `}
          >
            <div className="flex-shrink-0">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity cursor-pointer"
              type="button"
            >
              <span className="material-icons-round text-sm">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;

