/**
 * 🎯 ANALYTICS HOOK
 * Use this hook in components to track page views and clicks
 */

"use client";

import { useEffect } from "react";
import { trackPageView, trackClick } from "../lib/analytics-db";

/**
 * Hook to track page views on component mount
 */
export function useTrackPageView(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    trackPageView().catch(console.error);
  }, [enabled]);
}

/**
 * Hook to get tracking functions
 */
export function useTracking() {
  return {
    trackProductClick: () => trackClick("productClick"),
    trackCategoryClick: () => trackClick("categoryClick"),
    trackButtonClick: () => trackClick("buttonClick"),
    trackLinkClick: () => trackClick("linkClick"),
    trackBlogClick: () => trackClick("blogClick"),
    trackPurchaseWhatsApp: () => trackClick("purchase_whatsapp"),
    trackPurchaseTransfer: () => trackClick("purchase_transfer"),
  };
}
