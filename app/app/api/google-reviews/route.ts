import { NextResponse } from "next/server";

// Reemplaza con tu Place ID de Google Maps y tu API Key
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function GET() {
  if (!GOOGLE_PLACE_ID || !GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Faltan credenciales de Google Maps" }, { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${GOOGLE_PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Error al consultar Google Maps" }, { status: 500 });
    }
    const data = await res.json();
    const reviews = data.result?.reviews || [];
    const rating = data.result?.rating || null;
    const ratingCount = data.result?.user_ratings_total || null;
    return NextResponse.json({ reviews, rating, ratingCount });
  } catch (e) {
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
