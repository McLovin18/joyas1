"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type SiteSettings = {
  productWatermarkUrl: string | null;
  logoUrl: string | null;
  businessName: string;
  phoneNumber: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  businessDescription: string;
  businessAddress: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string | null;
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
  const [businessName, setBusinessName] = useState("CALI KIDS");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("593990077959");
  const [whatsappDisplay, setWhatsappDisplay] = useState("+593 99 007 7959");
  const [instagramUrl, setInstagramUrl] = useState("https://www.instagram.com/calikidsmobiliario/");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("Mobiliario infantil fabricado a medida. 100% en madera");
  const [businessAddress, setBusinessAddress] = useState("Envíos a todo el Ecuador 🇪🇨");
  const [seoTitle, setSeoTitle] = useState("CALI KIDS | Diseño & muebles infantiles a medida");
  const [seoDescription, setSeoDescription] = useState("Mobiliario infantil fabricado a medida, 100% en madera. Envíos a todo el Ecuador.");
  const [seoKeywords, setSeoKeywords] = useState("muebles infantiles, mobiliario infantil a medida, muebles de madera para niños, diseño de muebles infantiles Ecuador");
  const [seoOgImage, setSeoOgImage] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, "landingPage", "main");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() || {}) as Record<string, unknown>;
        const url = typeof data.productWatermarkUrl === "string" ? data.productWatermarkUrl : null;
        setProductWatermarkUrl(url);
        
        const logo = typeof data.logoUrl === "string" ? data.logoUrl : null;
        setLogoUrl(logo);
        
        const name = typeof data.businessName === "string" ? data.businessName : "CALI KIDS";
        setBusinessName(name);
        
        const phone = typeof data.phoneNumber === "string" ? data.phoneNumber : "";
        setPhoneNumber(phone);
        
        const waNumber = typeof data.whatsappNumber === "string" ? data.whatsappNumber : "593990077959";
        setWhatsappNumber(waNumber);
        
        const waDisplay = typeof data.whatsappDisplay === "string" ? data.whatsappDisplay : "+593 99 007 7959";
        setWhatsappDisplay(waDisplay);
        
        const insta = typeof data.instagramUrl === "string" ? data.instagramUrl : "https://www.instagram.com/calikidsmobiliario/";
        setInstagramUrl(insta);
        
        const tiktok = typeof data.tiktokUrl === "string" ? data.tiktokUrl : "";
        setTiktokUrl(tiktok);
        
        const facebook = typeof data.facebookUrl === "string" ? data.facebookUrl : "";
        setFacebookUrl(facebook);
        
        const businessDesc = typeof data.businessDescription === "string" ? data.businessDescription : "Mobiliario infantil fabricado a medida. 100% en madera";
        setBusinessDescription(businessDesc);
        
        const address = typeof data.businessAddress === "string" ? data.businessAddress : "Envíos a todo el Ecuador 🇪🇨";
        setBusinessAddress(address);
        
        const title = typeof data.seoTitle === "string" ? data.seoTitle : "CALI KIDS | Diseño & muebles infantiles a medida";
        setSeoTitle(title);
        
        const seoDesc = typeof data.seoDescription === "string" ? data.seoDescription : "Mobiliario infantil fabricado a medida, 100% en madera. Envíos a todo el Ecuador.";
        setSeoDescription(seoDesc);
        
        const keywords = typeof data.seoKeywords === "string" ? data.seoKeywords : "muebles infantiles, mobiliario infantil a medida, muebles de madera para niños, diseño de muebles infantiles Ecuador";
        setSeoKeywords(keywords);
        
        const ogImage = typeof data.seoOgImage === "string" ? data.seoOgImage : null;
        setSeoOgImage(ogImage);
        
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
        phoneNumber,
        whatsappNumber,
        whatsappDisplay,
        instagramUrl,
        tiktokUrl,
        facebookUrl,
        businessDescription,
        businessAddress,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoOgImage,
      },
    };
  }, [loading, productWatermarkUrl, logoUrl, businessName, phoneNumber, whatsappNumber, whatsappDisplay, instagramUrl, tiktokUrl, facebookUrl, businessDescription, businessAddress, seoTitle, seoDescription, seoKeywords, seoOgImage]);

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

