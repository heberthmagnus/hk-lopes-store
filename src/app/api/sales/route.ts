import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Use /api/admin/sales para registrar vendas no admin." },
    { status: 405 }
  );
}
