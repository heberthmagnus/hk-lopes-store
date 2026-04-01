import { NextResponse } from "next/server";

import { loginWithPassword, setAuthCookies } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json({ message: "Informe e-mail e senha." }, { status: 400 });
    }

    const session = await loginWithPassword(email, password);
    await setAuthCookies(session);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel entrar." },
      { status: 401 }
    );
  }
}
