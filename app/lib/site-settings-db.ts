import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export interface SiteSettingsData {
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
}

/**
 * Obtiene los settings del sitio desde Firestore (server-side)
 * Usado para generateMetadata en layout.tsx
 */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    const ref = doc(db, "landingPage", "main");
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      return getDefaultSettings();
    }

    const data = snap.data() as Record<string, unknown>;

    return {
      productWatermarkUrl: typeof data.productWatermarkUrl === "string" ? data.productWatermarkUrl : null,
      logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
      businessName: typeof data.businessName === "string" ? data.businessName : "CALI KIDS",
      phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
      whatsappNumber: typeof data.whatsappNumber === "string" ? data.whatsappNumber : "593990077959",
      whatsappDisplay: typeof data.whatsappDisplay === "string" ? data.whatsappDisplay : "+593 99 007 7959",
      instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl : "https://www.instagram.com/calikidsmobiliario/",
      tiktokUrl: typeof data.tiktokUrl === "string" ? data.tiktokUrl : "",
      facebookUrl: typeof data.facebookUrl === "string" ? data.facebookUrl : "",
      businessDescription: typeof data.businessDescription === "string" ? data.businessDescription : "Mobiliario infantil fabricado a medida. 100% en madera",
      businessAddress: typeof data.businessAddress === "string" ? data.businessAddress : "Envíos a todo el Ecuador 🇪🇨",
      seoTitle: typeof data.seoTitle === "string" ? data.seoTitle : "CALI KIDS | Diseño & muebles infantiles a medida",
      seoDescription: typeof data.seoDescription === "string" ? data.seoDescription : "Mobiliario infantil fabricado a medida, 100% en madera. Envíos a todo el Ecuador.",
      seoKeywords: typeof data.seoKeywords === "string" ? data.seoKeywords : "muebles infantiles, mobiliario infantil a medida, muebles de madera para niños, diseño de muebles infantiles Ecuador",
      seoOgImage: typeof data.seoOgImage === "string" ? data.seoOgImage : null,
    };
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return getDefaultSettings();
  }
}

function getDefaultSettings(): SiteSettingsData {
  return {
    productWatermarkUrl: null,
    logoUrl: null,
    businessName: "CALI KIDS",
    phoneNumber: "",
    whatsappNumber: "593990077959",
    whatsappDisplay: "+593 99 007 7959",
    instagramUrl: "https://www.instagram.com/calikidsmobiliario/",
    tiktokUrl: "",
    facebookUrl: "",
    businessDescription: "Mobiliario infantil fabricado a medida. 100% en madera",
    businessAddress: "Envíos a todo el Ecuador 🇪🇨",
    seoTitle: "CALI KIDS | Diseño & muebles infantiles a medida",
    seoDescription: "Mobiliario infantil fabricado a medida, 100% en madera. Envíos a todo el Ecuador.",
    seoKeywords: "muebles infantiles, mobiliario infantil a medida, muebles de madera para niños, diseño de muebles infantiles Ecuador",
    seoOgImage: null,
  };
}
