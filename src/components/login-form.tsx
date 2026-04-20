"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HK Lopes Store";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Nao foi possivel entrar.");
      }

      const nextPath = searchParams.get("next") || "/admin";
      router.push(nextPath);
      router.refresh();
    } catch (caughtError) {
      setFeedback(caughtError instanceof Error ? caughtError.message : "Falha ao entrar.");
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="hk-template-header">
        <div className="hk-template-header__topbar">
          <div className="hk-template-header__topbar-inner">
            <div className="hk-template-header__brand">
              <BrandLogo priority />
              <div className="hk-template-header__brand-copy">
                <strong>{APP_NAME}</strong>
                <span>Area de acesso administrativo</span>
              </div>
            </div>

            <div className="hk-template-header__actions">
              <Link className="hk-template-header__admin" href="/">
                Início
              </Link>
            </div>
          </div>
        </div>

        <div className="hk-template-header__menu">
          <nav className="hk-template-header__menu-inner" aria-label="Menu público">
            <Link className="active" href="/">
              Início
            </Link>
            <Link href="/login">Admin</Link>
          </nav>
        </div>
      </header>

      <div className="app-shell auth-shell">
        <section className="panel auth-panel">
          <div className="hero-brand">
            <BrandLogo priority />
            <div className="hero-brand-copy">
              <p className="eyebrow">HK Lopes Store</p>
              <h1>{APP_NAME}</h1>
              <p className="hero-copy">
                Entre com seu usuario do Supabase Auth para acessar a area administrativa.
              </p>
            </div>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className={`feedback ${error ? "error" : ""}`}>{feedback}</p>
        </section>
      </div>

      <footer className="hk-template-footer">
        <div className="hk-template-footer__inner">
          <div>
            <h3 className="hk-template-footer__title">HK Lopes Store</h3>
            <div className="hk-template-footer__info">
              <div>Acesso administrativo autenticado.</div>
              <div>Login seguro para operar produtos, vendas, clientes e relatórios.</div>
            </div>
          </div>

          <div className="hk-template-footer__logo">
            <BrandLogo />
          </div>

          <div className="hk-template-footer__motto">Controle interno da HK Lopes Store</div>
        </div>
      </footer>
    </>
  );
}
