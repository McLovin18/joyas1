import "./globals.css";

import Footer from "./components/Footer";
import { cookies } from "next/headers";
import Navbar from "./components/Navbar";
import { UserProvider } from "./context/UserContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { ToastProvider } from "./context/ToastContext";
import LayoutContentClient from "./components/LayoutContentClient";
import { StructuredData } from "./components/StructuredData";
import { getSiteSettings } from "./lib/site-settings-db";
import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";

// ISR Global
export const revalidate = 1800;

// Cambiar cuando tengas el dominio definitivo
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://calikidsmobiliario.com";

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-source-serif-4",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const SITE_NAME = settings.businessName || "CALI KIDS";
  const keywordsArray = settings.seoKeywords.split(',').map(k => k.trim()).filter(Boolean);

  return {
    title: {
      default: settings.seoTitle,
      template: `%s | ${SITE_NAME}`,
    },

    description: settings.seoDescription,

    keywords: keywordsArray,

    creator: SITE_NAME,

    publisher: SITE_NAME,

    metadataBase: new URL(SITE_URL),

    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon-16x16.png",
      apple: "/apple-touch-icon.png",
    },

    manifest: "/site.webmanifest",

    openGraph: {
      type: "website",
      locale: "es_EC",
      url: SITE_URL,
      siteName: SITE_NAME,

      title: settings.seoTitle,

      description: settings.seoDescription,

      images: settings.seoOgImage
        ? [
            {
              url: settings.seoOgImage,
              width: 1200,
              height: 630,
              alt: settings.seoTitle,
            },
          ]
        : [
            {
              url: `${SITE_URL}/og-image.jpg`,
              width: 1200,
              height: 630,
              alt: settings.seoTitle,
            },
          ],
    },

    twitter: {
      card: "summary_large_image",

      title: SITE_NAME,

      description: settings.seoDescription,

      images: settings.seoOgImage ? [settings.seoOgImage] : [`${SITE_URL}/twitter-image.jpg`],
    },

    alternates: {
      canonical: SITE_URL,
    },

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },

    verification: {
      google: "", // colocar Search Console cuando el dominio esté activo
    },

    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: SITE_NAME,
    },

    category: "muebles infantiles",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={sourceSerif4.variable}>
      <head>
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-K1Q0MYDSKF"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-K1Q0MYDSKF');
            `,
          }}
        />

        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />

        <StructuredData />
      </head>

      <body className="relative min-h-screen">

        {/* Capa oscura */}
        <div className="fixed inset-0 -z-10 bg-black/45" />

        <ToastProvider>
          <OnboardingProvider>
            <LayoutContentClient>
              {children}
            </LayoutContentClient>
          </OnboardingProvider>
        </ToastProvider>

      </body>
    </html>
  );
}