"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type SiteSettings = {
  productWatermarkUrl: string | null;
  logoUrl: string | null;
  businessName: string;
  whatsappNumber: string;
  phoneNumber: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  businessDescription: string;
  businessAddress: string;
};

type SiteSettingsContextType = {
  settings: SiteSettings;
  loading: boolean;
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [productWatermarkUrl, setProductWatermarkUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [facebookUrl, setFacebookUrl] = useState<string>("");
  const [businessDescription, setBusinessDescription] = useState<string>("");
  const [businessAddress, setBusinessAddress] = useState<string>("");

  useEffect(() => {
    const ref = doc(db, "landingPage", "main");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() || {}) as Record<string, unknown>;
        const url = typeof data.productWatermarkUrl === "string" ? data.productWatermarkUrl : null;
        const logo = typeof data.logoUrl === "string" ? data.logoUrl : null;
        const name = typeof data.businessName === "string" ? data.businessName : "";
        const whatsapp = typeof data.whatsappNumber === "string" ? data.whatsappNumber : "";
        const phone = typeof data.phoneNumber === "string" ? data.phoneNumber : "";
        const instagram = typeof data.instagramUrl === "string" ? data.instagramUrl : "";
        const tiktok = typeof data.tiktokUrl === "string" ? data.tiktokUrl : "";
        const facebook = typeof data.facebookUrl === "string" ? data.facebookUrl : "";
        const description = typeof data.businessDescription === "string" ? data.businessDescription : "";
        const address = typeof data.businessAddress === "string" ? data.businessAddress : "";
        
        setProductWatermarkUrl(url);
        setLogoUrl(logo);
        setBusinessName(name);
        setWhatsappNumber(whatsapp);
        setPhoneNumber(phone);
        setInstagramUrl(instagram);
        setTiktokUrl(tiktok);
        setFacebookUrl(facebook);
        setBusinessDescription(description);
        setBusinessAddress(address);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const value = useMemo<SiteSettingsContextType>(() => {
    return {
      loading,
      settings: {
        productWatermarkUrl,
        logoUrl,
        businessName,
        whatsappNumber,
        phoneNumber,
        instagramUrl,
        tiktokUrl,
        facebookUrl,
        businessDescription,
        businessAddress,
      },
    };
  }, [loading, productWatermarkUrl, logoUrl, businessName, whatsappNumber, phoneNumber, instagramUrl, tiktokUrl, facebookUrl, businessDescription, businessAddress]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextType {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  }
  return ctx;
}

