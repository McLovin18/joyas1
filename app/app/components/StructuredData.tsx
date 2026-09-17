/**
 * Componente para agregar estructuras de datos JSON-LD (Schema.org)
 * Esto ayuda a Google a entender mejor tu sitio
 */

export function StructuredData() {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://marcaestilo.com";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Marca Estilo",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "Tienda online de camisetas para hombre en Ecuador",
    sameAs: [
      "https://www.instagram.com/marcaestilo593/",
      "https://www.tiktok.com/@marcaestilomen",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "EC",
      addressLocality: "Quito", // Ajusta según tu ubicación
      postalCode: "170103",
      streetAddress: "Tu dirección aquí", // Actualiza
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "+593-XXX-XXXX", // Actualiza
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Marca Estilo",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products-by-category?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "Marca Estilo",
    image: `${SITE_URL}/logo.png`,
    description:
      "Tienda online de camisetas para hombre con envíos a todo Ecuador",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Tu dirección aquí",
      addressLocality: "Quito",
      addressRegion: "Pichincha",
      postalCode: "170103",
      addressCountry: "EC",
    },
    telephone: "+593-XXX-XXXX",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    areaServed: "EC",
    priceRange: "$$",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
    </>
  );
}

