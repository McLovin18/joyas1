import { NextResponse } from "next/server";
let puppeteer: typeof import('puppeteer');

export async function GET(request: Request) {
  // Importa Puppeteer dinámicamente para evitar problemas en entornos serverless
  if (!puppeteer) {
    puppeteer = (await import('puppeteer')).default;
  }
  const url = new URL(request.url);
  const placeId = url.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "Falta el place_id" }, { status: 400 });
  }

  // Construye la URL de Google Maps
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;

  try {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(mapsUrl, { waitUntil: "networkidle2" });

    // Espera a que aparezcan las reseñas
    await page.waitForSelector('[aria-label="Reseñas"]');
    await page.click('[aria-label="Reseñas"]');
    await page.waitForTimeout(2000);

    // Extrae las reseñas en español
    const reviews = await page.evaluate(() => {
      const reviewEls = document.querySelectorAll('.jftiEf');
      const result = [];
      reviewEls.forEach(el => {
        const author = el.querySelector('.d4r55')?.textContent || "";
        const text = el.querySelector('.wiI7pd')?.textContent || "";
        const rating = el.querySelector('.kvMYJc')?.getAttribute('aria-label') || "";
        const date = el.querySelector('.rsqaWe')?.textContent || "";
        const photo = el.querySelector('img')?.src || "";
        result.push({ author, text, rating, date, photo });
      });
      return result;
    });

    await browser.close();
    return NextResponse.json({ reviews });
  } catch (e) {
    return NextResponse.json({ error: "Error al hacer scraping", details: String(e) }, { status: 500 });
  }
}
