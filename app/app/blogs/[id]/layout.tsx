import type { Metadata } from "next";
import { getBlogById } from "../../lib/blogs-db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://marcaestilo.com";

// ISR: Revalidar cada hora (3600 segundos)
// Significa que la página se cachea por 1 hora, después se regenera
export const revalidate = 3600;

// Permitir rutas dinámicas fuera de las estáticas generadas
export const dynamicParams = true;

interface Props {
  params: Promise<{ id: string }>;
}

// Helper function to safely convert Firestore Timestamp to ISO string
function convertToISOString(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  
  // If it's a Firestore Timestamp object with _seconds property
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1_000_000).toISOString();
  }
  
  // If it's already a Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it's a number (milliseconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }
  
  // If it's a string, try to parse it
  if (typeof timestamp === 'string') {
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return undefined;
    }
  }
  
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const blog = await getBlogById(id);

    if (!blog) {
      return {
        title: "Artículo no encontrado | Marca Estilo",
        description: "El artículo que buscas no existe.",
      };
    }

    const description =
      blog.excerpt || blog.content?.substring(0, 160) || "Artículo de Marca Estilo";
    const imageUrl = blog.image || `${SITE_URL}/default-blog-image.jpg`;

    return {
      title: `${blog.title} | Marca Estilo`,
      description: description,
      keywords: blog.tags || ["camisetas", "moda masculina", "Marca Estilo"],
      openGraph: {
        type: "article",
        url: `${SITE_URL}/blogs/${id}`,
        title: blog.title,
        description: description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: blog.title,
          },
        ],
        publishedTime: convertToISOString(blog.createdAt),
        modifiedTime: convertToISOString(blog.updatedAt),
        authors: [blog.author || "Marca Estilo"],
      },
      twitter: {
        card: "summary_large_image",
        title: blog.title,
        description: description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${SITE_URL}/blogs/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generando metadata del blog:", error);
    return {
      title: "Artículo | Marca Estilo",
      description: "Cargando artículo...",
    };
  }
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
