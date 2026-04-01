"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { buildFallbackImage, formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/store";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HK Lopes Store";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

type PublicCatalogProps = {
  products: CatalogProduct[];
};

function buildWhatsappUrl(product: CatalogProduct) {
  const priceLabel =
    product.min_sale_price === product.max_sale_price
      ? formatCurrency(product.min_sale_price)
      : `${formatCurrency(product.min_sale_price)} a ${formatCurrency(product.max_sale_price)}`;
  const message = `Ola! Tenho interesse em ${product.name} da ${APP_NAME}. Faixa de preco: ${priceLabel}.`;
  const baseUrl = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=` : "https://wa.me/?text=";

  return `${baseUrl}${encodeURIComponent(message)}`;
}

export function PublicCatalog({ products }: PublicCatalogProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) =>
      [product.name, product.description].join(" ").toLowerCase().includes(term)
    );
  }, [products, search]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="hero-brand">
            <BrandLogo priority />
            <div className="hero-brand-copy">
              <p className="eyebrow">HK Lopes Store</p>
              <h1>{APP_NAME}</h1>
              <p className="hero-copy">
                Catalogo simples e rapido para visualizar produtos, imagens, descricao e comprar pelo WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <Link className="ghost-button hero-link" href="/login">
            Entrar no admin
          </Link>
        </div>
      </header>

      <main className="layout single-column">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Catalogo</p>
              <h2>Produtos</h2>
            </div>
            <div className="stats-inline">{filteredProducts.length} itens</div>
          </div>

          <label className="search-field">
            <span>Buscar produto</span>
            <input
              type="search"
              placeholder="Digite o nome do produto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="product-grid">
            {!filteredProducts.length ? (
              <div className="empty-state">Nenhum produto encontrado.</div>
            ) : null}

            {filteredProducts.map((product) => {
              const priceLabel =
                product.min_sale_price === product.max_sale_price
                  ? formatCurrency(product.min_sale_price)
                  : `${formatCurrency(product.min_sale_price)} - ${formatCurrency(product.max_sale_price)}`;

              return (
                <article key={product.id} className="catalog-card">
                  <Image
                    className="catalog-image"
                    src={product.image_url || buildFallbackImage(product.name)}
                    alt={product.name}
                    width={420}
                    height={320}
                  />

                  <div className="catalog-content">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-price">{priceLabel}</p>
                    <p className="product-copy">
                      {product.description || "Produto disponivel para compra rapida pelo WhatsApp."}
                    </p>

                    <a
                      className="primary-button catalog-buy"
                      href={buildWhatsappUrl(product)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Comprar por WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
