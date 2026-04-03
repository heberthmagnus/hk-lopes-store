"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import {
  buildFallbackImage,
  formatCurrency,
  formatNumber,
  getPriceRange,
  getProductTotalStock,
} from "@/lib/format";
import { parseVariationLines } from "@/lib/parse";
import type { AdminProduct, AdminStorePayload, ProductInput } from "@/types/store";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HK Lopes Store";

type ProductFormState = {
  id: number | "";
  name: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  costPrice: string;
  salePrice: string;
  active: boolean;
  imageUrl: string;
  variationsText: string;
};

const EMPTY_FORM: ProductFormState = {
  id: "",
  name: "",
  categoryId: "",
  subcategoryId: "",
  description: "",
  costPrice: "",
  salePrice: "",
  active: true,
  imageUrl: "",
  variationsText: "Padrao | 0 | 0",
};

type AdminDashboardProps = {
  initialPayload: AdminStorePayload;
  userEmail?: string;
};

type AdminStoreApiResponse =
  | ({ success: true; message: string; productId?: number } & AdminStorePayload)
  | { success: false; error: string };

type AdminSalesApiResponse =
  | ({
      success: true;
      message: string;
      sale: {
        quantity: number;
        productName: string;
        variationName: string;
        totalProfit: number;
      };
    } & AdminStorePayload)
  | { success: false; error: string };

async function parseApiResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
}

function getFriendlyError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Failed to fetch") {
    return "Nao foi possivel conectar ao servidor.";
  }

  if (error.message === "Unexpected end of JSON input" || error.message === "Resposta invalida do servidor.") {
    return "O servidor respondeu de forma invalida. Tente novamente.";
  }

  return error.message;
}

function formatSaleDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboard({ initialPayload, userEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialPayload.products[0]?.id ?? null);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(
    initialPayload.products[0]?.variations[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState("1");
  const [saleFeedback, setSaleFeedback] = useState("");
  const [saleError, setSaleError] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payload.products.filter((product) =>
      [product.name, product.description].join(" ").toLowerCase().includes(term)
    );
  }, [payload.products, search]);

  const selectedProduct = useMemo(
    () =>
      payload.products.find((product) => product.id === selectedProductId) ??
      filteredProducts[0] ??
      null,
    [filteredProducts, payload.products, selectedProductId]
  );

  const selectedVariation = useMemo(
    () =>
      selectedProduct?.variations.find((variation) => variation.id === selectedVariationId) ??
      selectedProduct?.variations[0] ??
      null,
    [selectedProduct, selectedVariationId]
  );

  function applyPayload(nextPayload: AdminStorePayload) {
    setPayload(nextPayload);

    const nextProduct =
      nextPayload.products.find((product) => product.id === selectedProductId) ??
      nextPayload.products[0] ??
      null;

    setSelectedProductId(nextProduct?.id ?? null);
    setSelectedVariationId(nextProduct?.variations[0]?.id ?? null);
  }

  function chooseProduct(product: AdminProduct) {
    setSelectedProductId(product.id);
    setSelectedVariationId(product.variations[0]?.id ?? null);
    setSaleFeedback(`${product.name} selecionado.`);
    setSaleError(false);
  }

  function editProduct(product: AdminProduct) {
    setForm({
      id: product.id,
      name: product.name,
      categoryId: String(product.category_id),
      subcategoryId: product.subcategory_id ? String(product.subcategory_id) : "",
      description: product.description,
      costPrice: String(product.cost_price),
      salePrice: String(product.sale_price),
      active: product.active,
      imageUrl: product.image_url,
      variationsText: product.variations
        .map(
          (variation) => `${variation.name} | ${variation.extra_price} | ${variation.stock}`
        )
        .join("\n"),
    });
    setAdminFeedback(`Editando ${product.name}.`);
    setAdminError(false);
  }

  async function handleSaveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.categoryId) {
      setAdminFeedback("Selecione uma categoria.");
      setAdminError(true);
      return;
    }

    if (availableSubcategories.length > 0 && !form.subcategoryId) {
      setAdminFeedback("Selecione uma subcategoria.");
      setAdminError(true);
      return;
    }

    try {
      const input: ProductInput = {
        id: typeof form.id === "number" ? form.id : undefined,
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
        description: form.description.trim(),
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        active: form.active,
        imageUrl: form.imageUrl.trim(),
        variations: parseVariationLines(form.variationsText),
      };
      const requestBody = {
        id: input.id,
        name: input.name,
        category_id: input.categoryId,
        subcategory_id: input.subcategoryId,
        description: input.description,
        cost_price: input.costPrice,
        sale_price: input.salePrice,
        active: input.active,
        image_url: input.imageUrl,
        variants: input.variations.map((variation) => ({
          name: variation.name,
          extra_price: variation.extraPrice,
          stock: variation.stock,
        })),
      };

      setSavingProduct(true);
      const response = await fetch("/api/admin/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const nextPayload = await parseApiResponse<AdminStoreApiResponse>(response);

      if (!response.ok || !nextPayload.success) {
        throw new Error(nextPayload.success ? "Nao foi possivel salvar o produto." : nextPayload.error);
      }

      applyPayload(nextPayload);
      setSelectedProductId(nextPayload.productId ?? null);
      const createdProduct = nextPayload.products.find((product) => product.id === nextPayload.productId);
      setSelectedVariationId(createdProduct?.variations[0]?.id ?? null);
      setForm(EMPTY_FORM);
      setAdminFeedback(nextPayload.message);
      setAdminError(false);
    } catch (caughtError) {
      setAdminFeedback(getFriendlyError(caughtError, "Falha ao salvar o produto."));
      setAdminError(true);
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleToggleProduct(product: AdminProduct) {
    try {
      setTogglingProductId(product.id);
      const response = await fetch("/api/admin/store", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          active: !product.active,
        }),
      });

      const nextPayload = await parseApiResponse<AdminStoreApiResponse>(response);

      if (!response.ok || !nextPayload.success) {
        throw new Error(
          nextPayload.success
            ? "Nao foi possivel atualizar o status do produto."
            : nextPayload.error
        );
      }

      applyPayload(nextPayload);
      setAdminFeedback(nextPayload.message);
      setAdminError(false);
    } catch (caughtError) {
      setAdminFeedback(getFriendlyError(caughtError, "Falha ao atualizar o status do produto."));
      setAdminError(true);
    } finally {
      setTogglingProductId(null);
    }
  }

  async function handleSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct || !selectedVariation) {
      setSaleFeedback("Selecione um produto e uma variacao.");
      setSaleError(true);
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setSaleFeedback("Informe uma quantidade valida.");
      setSaleError(true);
      return;
    }

    setSubmittingSale(true);

    try {
      const response = await fetch("/api/admin/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          variationId: selectedVariation.id,
          quantity: parsedQuantity,
        }),
      });

      const nextPayload = await parseApiResponse<AdminSalesApiResponse>(response);

      if (!response.ok || !nextPayload.success) {
        throw new Error(
          nextPayload.success
            ? "Nao foi possivel registrar a venda."
            : nextPayload.error
        );
      }

      applyPayload(nextPayload);
      setQuantity("1");
      setSaleFeedback(
        `Venda registrada: ${nextPayload.sale.quantity}x ${nextPayload.sale.productName} ${nextPayload.sale.variationName} | lucro ${formatCurrency(
          nextPayload.sale.totalProfit
        )}`
      );
      setSaleError(false);
    } catch (caughtError) {
      setSaleFeedback(getFriendlyError(caughtError, "Falha ao registrar a venda."));
      setSaleError(true);
    } finally {
      setSubmittingSale(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setAdminFeedback("Formulario limpo.");
    setAdminError(false);
  }

  const priceRange = selectedProduct ? getPriceRange(selectedProduct.variations) : null;
  const availableSubcategories = useMemo(
    () =>
      payload.subcategories.filter(
        (subcategory) => String(subcategory.category_id) === form.categoryId
      ),
    [form.categoryId, payload.subcategories]
  );
  const estimatedProfit =
    selectedVariation && Number(quantity) > 0
      ? (selectedVariation.display_price - (selectedProduct?.cost_price ?? 0)) * Number(quantity)
      : 0;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="hero-brand">
            <BrandLogo size="compact" priority />
            <div className="hero-brand-copy">
              <p className="eyebrow">HK Lopes Store</p>
              <h1>{APP_NAME} Admin</h1>
              <p className="hero-copy">
                Cadastro, estoque, vendas manuais e metricas internas em um painel simples e rapido.
              </p>
              <p className="hero-meta">{userEmail ? `Logado como ${userEmail}` : "Area autenticada"}</p>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Produtos</span>
          <strong>{formatNumber(payload.summary.productCount)}</strong>
          <small>{formatNumber(payload.summary.variationCount)} variacoes</small>
        </article>
        <article className="stat-card">
          <span>Estoque</span>
          <strong>{formatNumber(payload.summary.totalStock)}</strong>
          <small>itens disponiveis</small>
        </article>
        <article className="stat-card">
          <span>Vendas</span>
          <strong>{formatNumber(payload.summary.salesCount)}</strong>
          <small>{formatCurrency(payload.summary.totalRevenue)}</small>
        </article>
        <article className="stat-card accent">
          <span>Lucro</span>
          <strong>{formatCurrency(payload.summary.totalProfit)}</strong>
          <small>calculado por receita - custo</small>
        </article>
      </section>

      <main className="layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Gestao</p>
              <h2>Produtos e estoque</h2>
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

          <div className="product-list">
            {!filteredProducts.length ? (
              <div className="empty-state">Nenhum produto encontrado.</div>
            ) : null}

            {filteredProducts.map((product) => {
              const productPriceRange = getPriceRange(product.variations);
              const totalStock = getProductTotalStock(product.variations);

              return (
                <article
                  key={product.id}
                  className={`product-card ${selectedProduct?.id === product.id ? "selected" : ""}`}
                >
                  <Image
                    className="product-image"
                    src={product.image_url || buildFallbackImage(product.name)}
                    alt={product.name}
                    width={96}
                    height={96}
                  />
                  <div className="product-content">
                    <div className="product-header">
                      <div>
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-price">
                          {productPriceRange
                            ? productPriceRange.min === productPriceRange.max
                              ? formatCurrency(productPriceRange.min)
                              : `${formatCurrency(productPriceRange.min)} - ${formatCurrency(productPriceRange.max)}`
                            : "Sem preco"}
                        </p>
                      </div>
                      <span className={`stock-badge ${product.active ? "" : "inactive"}`}>
                        {product.active ? `${formatNumber(totalStock)} em estoque` : "Produto inativo"}
                      </span>
                    </div>

                    <p className="product-copy">{product.description || "Produto cadastrado para venda rapida."}</p>

                    <div className="product-meta">
                      <span className={product.active ? "status-pill active" : "status-pill inactive"}>
                        {product.active ? "Ativo no catalogo" : "Inativo no catalogo"}
                      </span>
                      <span>{formatNumber(product.variations.length)} variacoes</span>
                      <span>
                        {product.category_name}
                        {product.subcategory_name ? ` / ${product.subcategory_name}` : ""}
                      </span>
                    </div>

                    <div className="product-actions">
                      <button className="primary-button" type="button" onClick={() => chooseProduct(product)}>
                        Selecionar
                      </button>
                      <button className="ghost-button" type="button" onClick={() => editProduct(product)}>
                        Editar
                      </button>
                      <button
                        className={product.active ? "secondary-button danger" : "secondary-button"}
                        type="button"
                        onClick={() => handleToggleProduct(product)}
                        disabled={togglingProductId === product.id}
                      >
                        {togglingProductId === product.id
                          ? "Atualizando..."
                          : product.active
                            ? "Desativar produto"
                            : "Reativar produto"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Venda manual</p>
                <h2>Registrar venda</h2>
              </div>
            </div>

            <div className={`selected-product ${selectedProduct ? "" : "empty"}`}>
              {selectedProduct ? (
                <>
                  <strong>{selectedProduct.name}</strong>
                  <span>{selectedProduct.description || "Produto pronto para venda."}</span>
                  <span>
                    {priceRange
                      ? priceRange.min === priceRange.max
                        ? formatCurrency(priceRange.min)
                        : `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`
                      : "Sem preco"}
                  </span>
                </>
              ) : (
                "Selecione um produto para vender."
              )}
            </div>

            <form className="stack" onSubmit={handleSale}>
              <label>
                <span>Variacao</span>
                <select
                  value={selectedVariation?.id ?? ""}
                  onChange={(event) => setSelectedVariationId(Number(event.target.value))}
                  disabled={!selectedProduct}
                >
                  {(selectedProduct?.variations ?? []).map((variation) => (
                    <option key={variation.id} value={variation.id}>
                      {variation.name} | {formatCurrency(variation.display_price)} | estoque {variation.stock}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantidade</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <div className="profit-box">
                <span>Lucro estimado</span>
                <strong>{formatCurrency(estimatedProfit)}</strong>
                <small>
                  {selectedVariation
                    ? `Margem unitaria ${formatCurrency(selectedVariation.display_price - (selectedProduct?.cost_price ?? 0))}`
                    : "Selecione uma variacao"}
                </small>
              </div>

              <button className="primary-button" type="submit" disabled={submittingSale}>
                {submittingSale ? "Salvando..." : "Registrar venda"}
              </button>
            </form>

            <p className={`feedback ${saleError ? "error" : ""}`}>{saleFeedback}</p>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Historico</p>
                <h2>Vendas recentes</h2>
              </div>
            </div>

            <div className="sales-history">
              {!payload.salesHistory.length ? (
                <div className="empty-state">Nenhuma venda registrada ainda.</div>
              ) : (
                payload.salesHistory.map((sale) => (
                  <article key={sale.id} className="history-card">
                    <div className="history-row">
                      <strong>{formatSaleDate(sale.created_at)}</strong>
                      <span>{formatCurrency(sale.total_amount)}</span>
                    </div>
                    <div className="history-row muted">
                      <span>Lucro {formatCurrency(sale.total_profit)}</span>
                      <span>{formatNumber(sale.item_count)} itens</span>
                    </div>
                    <p className="history-items">{sale.item_names.join(", ") || "Itens nao encontrados."}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Cadastro</p>
                <h2>Adicionar ou editar produto</h2>
              </div>
            </div>

            <form className="stack" onSubmit={handleSaveProduct}>
              <label>
                <span>Nome do produto</span>
                <input
                  type="text"
                  placeholder="Ex.: Camiseta HK"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                      subcategoryId:
                        payload.subcategories.some(
                          (subcategory) =>
                            String(subcategory.id) === current.subcategoryId &&
                            String(subcategory.category_id) === event.target.value
                        )
                          ? current.subcategoryId
                          : "",
                    }))
                  }
                >
                  <option value="">Selecione uma categoria</option>
                  {payload.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Subcategoria</span>
                <select
                  value={form.subcategoryId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subcategoryId: event.target.value }))
                  }
                  disabled={!form.categoryId || !availableSubcategories.length}
                >
                  <option value="">
                    {!form.categoryId
                      ? "Selecione uma categoria primeiro"
                      : availableSubcategories.length
                        ? "Selecione uma subcategoria"
                        : "Nenhuma subcategoria cadastrada"}
                  </option>
                  {availableSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Descricao</span>
                <input
                  type="text"
                  placeholder="Resumo rapido para o catalogo"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>

              <label>
                <span>Preco de custo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.costPrice}
                  onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))}
                />
              </label>

              <label>
                <span>Preco de venda</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.salePrice}
                  onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value }))}
                />
              </label>

              <label className="checkbox-field">
                <span>Produto ativo no catalogo</span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
              </label>

              <label>
                <span>Imagem do produto</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                />
              </label>

              <label>
                <span>Variacoes</span>
                <textarea
                  rows={6}
                  placeholder="Nome | Extra | Estoque"
                  value={form.variationsText}
                  onChange={(event) => setForm((current) => ({ ...current, variationsText: event.target.value }))}
                />
              </label>

              <div className="button-row">
                <button className="primary-button" type="submit" disabled={savingProduct}>
                  {savingProduct ? "Salvando..." : "Salvar produto"}
                </button>
                <button className="ghost-button" type="button" onClick={resetForm}>
                  Limpar
                </button>
              </div>
            </form>

            <p className={`feedback ${adminError ? "error" : ""}`}>{adminFeedback}</p>
          </section>
        </aside>
      </main>
    </div>
  );
}
