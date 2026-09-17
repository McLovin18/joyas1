import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Borrar cookies de sesión y rol de forma explícita
  response.cookies.delete("session");
  response.cookies.delete("role");

  return response;
}
