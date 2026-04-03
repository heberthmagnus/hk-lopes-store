"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Barlow, Barlow_Condensed, Bebas_Neue } from "next/font/google";

import { BrandLogo } from "@/components/brand-logo";
import { buildFallbackImage, formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/store";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-barlow-condensed",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HK Lopes Store";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const FOOTER_WHATSAPP_NUMBER = WHATSAPP_NUMBER || "5531982645649";

const CATEGORY_META = [
  {
    key: "Tecnologia",
    label: "⚡ Tecnologia",
    subtitle: "Fones · Caixas de Som · Acessórios",
    heroWord: "Tecnologia",
    heroText: "Performance e conectividade para vender com impacto visual.",
  },
  {
    key: "Vestuário",
    label: "👕 Vestuário",
    subtitle: "Camisas · Roupas · Moda",
    heroWord: "Vestuário",
    heroText: "Peças com identidade forte para atendimento rápido e venda fácil.",
  },
  {
    key: "Utilidades",
    label: "📦 Utilidades",
    subtitle: "Carregadores · Cabos · Essenciais",
    heroWord: "Utilidades",
    heroText: "Itens úteis para rotina, presente e conversão direta no WhatsApp.",
  },
] as const;

type PublicCatalogProps = {
  products: CatalogProduct[];
};

type StoreCategory = (typeof CATEGORY_META)[number]["key"];

type DecoratedProduct = CatalogProduct & {
  storefrontCategory: StoreCategory;
  optionalTag?: string;
};

function normalizeCategory(category: string): StoreCategory {
  const normalized = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (
    normalized.includes("tec") ||
    normalized.includes("eletron") ||
    normalized.includes("fone") ||
    normalized.includes("gamer") ||
    normalized.includes("informat")
  ) {
    return "Tecnologia";
  }

  if (
    normalized.includes("util") ||
    normalized.includes("casa") ||
    normalized.includes("cozinha") ||
    normalized.includes("garrafa") ||
    normalized.includes("organiz") ||
    normalized.includes("cab")
  ) {
    return "Utilidades";
  }

  return "Vestuário";
}

function buildPriceLabel(product: CatalogProduct) {
  return product.min_sale_price === product.max_sale_price
    ? formatCurrency(product.min_sale_price)
    : `${formatCurrency(product.min_sale_price)} - ${formatCurrency(product.max_sale_price)}`;
}

function buildWhatsappUrl(product: CatalogProduct) {
  const message = `Olá! Quero ${product.name} - ${buildPriceLabel(product)} - HK Lopes Store.`;
  const baseUrl = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=` : "https://wa.me/?text=";

  return `${baseUrl}${encodeURIComponent(message)}`;
}

function getProductTag(product: DecoratedProduct) {
  const rawTag = product.optionalTag?.trim().toLowerCase();

  if (rawTag?.includes("oferta") || rawTag?.includes("promo")) {
    return { label: "🔥 Oferta", className: "offer" };
  }

  if (rawTag?.includes("novo")) {
    return { label: "Novo", className: "new" };
  }

  if (rawTag?.includes("top") || rawTag?.includes("destaque")) {
    return { label: "⭐ Top Venda", className: "top" };
  }

  return null;
}

export function PublicCatalog({ products }: PublicCatalogProps) {
  const catalogRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Todos" | StoreCategory>("Todos");
  const [activeSlide, setActiveSlide] = useState(0);

  const decoratedProducts = useMemo<DecoratedProduct[]>(
    () =>
      products.map((product) => ({
        ...product,
        storefrontCategory: normalizeCategory(product.category),
        optionalTag: (product as CatalogProduct & { tag?: string }).tag,
      })),
    [products]
  );

  const slides = useMemo(
    () =>
      CATEGORY_META.map((categoryMeta, index) => {
        const product =
          decoratedProducts.find((item) => item.storefrontCategory === categoryMeta.key) ??
          decoratedProducts[index] ??
          decoratedProducts[0] ??
          null;

        return {
          ...categoryMeta,
          product,
        };
      }),
    [decoratedProducts]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return decoratedProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || product.storefrontCategory === selectedCategory;
      const matchesSearch = [product.name, product.description, product.category]
        .join(" ")
        .toLowerCase()
        .includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [decoratedProducts, search, selectedCategory]);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  function moveSlide(direction: "previous" | "next") {
    setActiveSlide((current) => {
      if (!slides.length) {
        return 0;
      }

      return direction === "previous"
        ? (current - 1 + slides.length) % slides.length
        : (current + 1) % slides.length;
    });
  }

  function handleCategorySelect(category: StoreCategory) {
    setSelectedCategory(category);
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={["hk-homepage", bebasNeue.variable, barlow.variable, barlowCondensed.variable].join(" ")}>
      <header className="hk-header">
        <div className="hk-header__inner">
          <div className="hk-header__brand">
            <BrandLogo priority />
            <div className="hk-header__brand-copy">
              <strong>HK Lopes Store</strong>
              <span>Tecnologia · Vestuário · Utilidades</span>
            </div>
          </div>

          <label className="hk-header__search" aria-label="Buscar produtos">
            <div className="hk-header__search-shell">
              <input
                type="search"
                placeholder="Pesquisar na HK Lopes Store"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="hk-header__search-button" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="hk-header__search-icon" role="presentation">
                  <path
                    d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
          </label>

          <div className="hk-header__actions">
            <Link className="hk-header__admin" href="/login">
              <svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
                <path
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z"
                  fill="currentColor"
                />
              </svg>
              <span>Admin</span>
            </Link>
            {/* Future slot: Login · Favoritos · Carrinho */}
          </div>
        </div>
      </header>

      <section className="hk-carousel" aria-label="Top vendas da HK Lopes Store">
        <div className="hk-carousel__track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
          {slides.map((slide, index) => (
            <article
              key={slide.key}
              className={`hk-slide hk-slide--${slide.key
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()}`}
              aria-hidden={index !== activeSlide}
            >
              <div className="hk-slide__content">
                <div className="hk-slide__copy">
                  <span className="hk-slide__tag">{slide.key}</span>
                  <h1 className="slide-title">
                    Top <span>{slide.heroWord}</span> para vender mais
                  </h1>
                  <p>{slide.product?.description || slide.heroText}</p>
                  <strong className="hk-slide__price">
                    {slide.product ? buildPriceLabel(slide.product) : "Consulte no WhatsApp"}
                  </strong>
                  <a
                    className="hk-slide__cta"
                    href={
                      slide.product
                        ? buildWhatsappUrl(slide.product)
                        : WHATSAPP_NUMBER
                          ? `https://wa.me/${WHATSAPP_NUMBER}`
                          : "https://wa.me/"
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    📲 Comprar agora
                  </a>
                </div>

                <div className="hk-slide__media">
                  <Image
                    src={slide.product?.image_url || buildFallbackImage(slide.product?.name ?? slide.key)}
                    alt={slide.product?.name ?? slide.key}
                    width={220}
                    height={220}
                    className="hk-slide__image"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          className="hk-carousel__arrow hk-carousel__arrow--left"
          type="button"
          aria-label="Slide anterior"
          onClick={() => moveSlide("previous")}
        >
          ‹
        </button>
        <button
          className="hk-carousel__arrow hk-carousel__arrow--right"
          type="button"
          aria-label="Próximo slide"
          onClick={() => moveSlide("next")}
        >
          ›
        </button>

        <div className="hk-carousel__dots" aria-label="Indicadores do carrossel">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              className={`hk-carousel__dot ${index === activeSlide ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Abrir slide ${slide.key}`}
            />
          ))}
        </div>
      </section>

      <section className="hk-categories" aria-label="Categorias em destaque">
        {CATEGORY_META.map((categoryMeta) => {
          const categoryProduct =
            decoratedProducts.find((item) => item.storefrontCategory === categoryMeta.key) ?? null;
          const categorySlug = categoryMeta.key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          return (
            <button
              key={categoryMeta.key}
              className={`hk-category-card hk-category-card--${categorySlug}`}
              type="button"
              onClick={() => handleCategorySelect(categoryMeta.key)}
            >
              <span
                className="hk-category-card__bg"
                style={{
                  backgroundImage: categoryProduct?.image_url ? `url(${categoryProduct.image_url})` : undefined,
                }}
              />
              <span className="hk-category-card__overlay" />
              <span className="hk-category-card__arrow">→</span>
              <span className="hk-category-card__body">
                <strong>{categoryMeta.label}</strong>
                <small>{categoryMeta.subtitle}</small>
              </span>
            </button>
          );
        })}
      </section>

      <section className="hk-products" id="catalogo" ref={catalogRef}>
        <div className="hk-products__header">
          <div>
            <h2>
              Todos os <span>Produtos</span>
            </h2>
            <p>{filteredProducts.length} produtos disponíveis</p>
          </div>
        </div>

        <div className="hk-products__controls">
          <div className="hk-products__filters">
            <button
              className={`hk-filter ${selectedCategory === "Todos" ? "active" : ""}`}
              type="button"
              onClick={() => setSelectedCategory("Todos")}
            >
              Todos
            </button>
            {CATEGORY_META.map((categoryMeta) => (
              <button
                key={categoryMeta.key}
                className={`hk-filter ${selectedCategory === categoryMeta.key ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedCategory(categoryMeta.key)}
              >
                {categoryMeta.label}
              </button>
            ))}
          </div>
        </div>

        {!filteredProducts.length ? (
          <div className="empty-state">Nenhum produto encontrado para os filtros atuais.</div>
        ) : (
          <div className="hk-products__grid">
            {filteredProducts.map((product, index) => {
              const tag = getProductTag(product);

              return (
                <article key={product.id} className="hk-product-card" style={{ animationDelay: `${index * 0.04}s` }}>
                  <div className="hk-product-card__media">
                    <Image
                      src={product.image_url || buildFallbackImage(product.name)}
                      alt={product.name}
                      width={360}
                      height={360}
                      className="hk-product-card__image"
                    />
                    {tag ? (
                      <span className={`hk-product-card__badge hk-product-card__badge--${tag.className}`}>
                        {tag.label}
                      </span>
                    ) : null}
                  </div>

                  <div className="hk-product-card__body">
                    <strong className="hk-product-card__price">{buildPriceLabel(product)}</strong>
                    <h3>{product.name}</h3>
                    <div className="hk-product-card__footer">
                      <a
                        className="hk-product-card__cta"
                        href={buildWhatsappUrl(product)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Comprar
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="hk-footer">
        <div className="hk-footer__inner">
          <div className="hk-footer__brand">
            <BrandLogo size="compact" />
            <div>
              <strong>HK Lopes Store</strong>
              <span>Tecnologia · Vestuário · Utilidades</span>
            </div>
          </div>

          <div className="hk-footer__info">
            <span>Atendimento pelo WhatsApp</span>
            <a
              className="hk-footer__contact"
              href={`https://wa.me/${FOOTER_WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" role="presentation">
                <path
                  fill="currentColor"
                  d="M19.05 4.94A9.9 9.9 0 0 0 12 2a9.93 9.93 0 0 0-8.6 14.9L2 22l5.24-1.37A9.94 9.94 0 0 0 22 11.95a9.86 9.86 0 0 0-2.95-7.01ZM12 20.06a8.05 8.05 0 0 1-4.1-1.12l-.3-.18-3.11.81.83-3.03-.2-.31A8.07 8.07 0 1 1 12 20.06Zm4.42-5.98c-.24-.12-1.4-.69-1.62-.76-.22-.08-.38-.12-.54.12-.16.24-.62.76-.77.92-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.5.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 1.99 0 1.17.86 2.3.98 2.46.12.16 1.68 2.56 4.07 3.59.57.24 1.01.38 1.36.48.57.18 1.08.16 1.49.1.45-.06 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28Z"
                />
              </svg>
              <strong>{FOOTER_WHATSAPP_NUMBER}</strong>
            </a>
          </div>

          <a
            className="hk-footer__cta"
            href={`https://wa.me/${FOOTER_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar Agora
          </a>
        </div>
      </footer>
    </div>
  );
}
