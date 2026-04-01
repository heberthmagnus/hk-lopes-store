import { NextResponse } from "next/server";

import { getCatalogPayload } from "@/lib/store-data";

export async function GET() {
  try {
    const payload = await getCatalogPayload();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel carregar o catalogo." },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { message: "Use /api/admin/store para operacoes administrativas." },
    { status: 405 }
  );
}
