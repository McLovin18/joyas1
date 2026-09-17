import { getLandingByVersion, saveLandingSections } from "../../../lib/landing-db";
import { NextResponse } from "next/server";

/**
 * API para agregar la sección Hero360 a la landing page.
 * Llamar una sola vez: GET /api/admin/add-hero360-section
 */
export async function GET() {
  try {
    // Cargar secciones actuales del draft
    const landing = await getLandingByVersion("draft");
    const currentSections = landing?.sections || [];

    // Verificar si ya existe hero360
    const heroExists = currentSections.some((s: any) => s.type === "hero360");
    if (heroExists) {
      return NextResponse.json(
        { message: "La sección hero360 ya existe" },
        { status: 400 }
      );
    }

    // Calcular orden: si hay N secciones, penúltima es N (las otras 0...N-1)
    // Ajustar órdenes existentes para insertar antes de la última
    const updatedSections = currentSections.map((s: any, index: number) => ({
      ...s,
      order:
        index >= currentSections.length - 1
          ? index + 1 // Última se vuelve última+1
          : (s.order ?? index),
    }));

    // Crear nueva sección hero360
    const newHero360Section = {
      id: `hero360-${Date.now()}`,
      type: "hero360",
      order: currentSections.length - 1, // Penúltima posición
      props: {
        heading: "Construye tu",
        subheading: "NUEVA PC",
        description:
          "Utiliza nuestro PC Builder para armar tu pc soñada, nosotros te ayudamos con el asesoramiento y el ensamblaje.",
        primaryButtonText: "PC BUILDER",
        primaryButtonLink: "#pc-builder",
        secondaryButtonText: "PIDE ASESORAMIENTO",
        secondaryButtonLink: "#asesoramiento",
        images: [
          "/img_1.png",
          "/img_2.png",
          "/img_3.png",
          "/img_4.png",
        ],
        autoPlay: true,
        interval: 200,
      },
      styles: {},
      hidden: false,
    };

    // Agregar la nueva sección
    const finalSections = [...updatedSections, newHero360Section];

    // Guardar en Firestore
    await saveLandingSections(finalSections, "draft");

    return NextResponse.json({
      message: "Sección Hero360 agregada exitosamente",
      section: newHero360Section,
      totalSections: finalSections.length,
    });
  } catch (error) {
    console.error("Error agregando hero360:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
