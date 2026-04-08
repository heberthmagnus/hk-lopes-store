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
import type { AdminProduct, AdminStorePayload, CustomerSource, ProductInput } from "@/types/store";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HK Lopes Store";
const NEW_CUSTOMER_VALUE = "__new__";

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

type CustomerFormState = {
  id: number | "";
  name: string;
  phone: string;
  notes: string;
  birthDay: string;
  birthMonth: string;
  source: CustomerSource;
};

type SaleFormState = {
  customerSelection: string;
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  customerBirthDay: string;
  customerBirthMonth: string;
  customerSource: CustomerSource;
  paymentMethod: "pix" | "dinheiro" | "debito" | "credito";
  discountType: "amount" | "percent";
  discountValue: string;
  paymentFeeValue: string;
  installmentCount: string;
  installmentAmount: string;
  firstPaymentDate: string;
  saleNotes: string;
};

type SaleDraftItem = {
  productId: number;
  productName: string;
  variationId: number;
  variationName: string;
  quantity: number;
  unitPrice: number;
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

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  id: "",
  name: "",
  phone: "",
  notes: "",
  birthDay: "",
  birthMonth: "",
  source: "outro",
};

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DEFAULT_SALE_FORM: SaleFormState = {
  customerSelection: "",
  customerName: "",
  customerPhone: "",
  customerNotes: "",
  customerBirthDay: "",
  customerBirthMonth: "",
  customerSource: "outro",
  paymentMethod: "pix",
  discountType: "amount",
  discountValue: "0",
  paymentFeeValue: "0",
  installmentCount: "1",
  installmentAmount: "",
  firstPaymentDate: getTodayInputDate(),
  saleNotes: "",
};

const CUSTOMER_SOURCE_OPTIONS: Array<{ value: CustomerSource; label: string }> = [
  { value: "familiar", label: "Familiar" },
  { value: "amigo", label: "Amigo" },
  { value: "indicacao", label: "Indicacao" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "feira", label: "Feira" },
  { value: "cliente_recorrente", label: "Cliente recorrente" },
  { value: "outro", label: "Outro" },
];

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
        itemCount: number;
        productName: string;
        variationName: string;
        totalAmount: number;
        totalProfit: number;
      };
    } & AdminStorePayload)
  | { success: false; error: string };

type AdminCustomersApiResponse =
  | ({ success: true; message: string; customerId?: number } & AdminStorePayload)
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

function formatPaymentMethod(value: string | null) {
  switch (value) {
    case "pix":
      return "Pix";
    case "dinheiro":
      return "Dinheiro";
    case "debito":
      return "Debito";
    case "credito":
      return "Credito";
    default:
      return "Nao informado";
  }
}

function formatCustomerSource(value: CustomerSource) {
  const option = CUSTOMER_SOURCE_OPTIONS.find((item) => item.value === value);
  return option?.label ?? "Outro";
}

function buildWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function formatBirthday(day: number | null, month: number | null) {
  if (!day || !month) {
    return "Sem aniversario cadastrado";
  }

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function AdminDashboard({ initialPayload, userEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [activeSection, setActiveSection] = useState<"dashboard" | "products" | "sales" | "customers">("dashboard");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialPayload.products[0]?.id ?? null);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(
    initialPayload.products[0]?.variations[0]?.id ?? null
  );
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(initialPayload.salesHistory[0]?.id ?? null);
  const [quantity, setQuantity] = useState("1");
  const [saleForm, setSaleForm] = useState<SaleFormState>(DEFAULT_SALE_FORM);
  const [saleItems, setSaleItems] = useState<SaleDraftItem[]>([]);
  const [saleFeedback, setSaleFeedback] = useState("");
  const [saleError, setSaleError] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [customerError, setCustomerError] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);

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

  const availableSubcategories = useMemo(
    () =>
      payload.subcategories.filter(
        (subcategory) => String(subcategory.category_id) === form.categoryId
      ),
    [form.categoryId, payload.subcategories]
  );

  const selectedExistingCustomer = useMemo(() => {
    if (!saleForm.customerSelection || saleForm.customerSelection === NEW_CUSTOMER_VALUE) {
      return null;
    }

    return payload.customers.find((customer) => String(customer.id) === saleForm.customerSelection) ?? null;
  }, [payload.customers, saleForm.customerSelection]);

  const isCreatingCustomer = saleForm.customerSelection === NEW_CUSTOMER_VALUE;
  const priceRange = selectedProduct ? getPriceRange(selectedProduct.variations) : null;
  const grossAmount = saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountValue = Number(saleForm.discountValue || "0");
  const paymentFeeValue = Number(saleForm.paymentFeeValue || "0");
  const installmentCount = Math.max(Number(saleForm.installmentCount || "1"), 1);
  const manualInstallmentAmount = Number(saleForm.installmentAmount || "0");
  const discountAmount =
    saleForm.discountType === "percent" ? grossAmount * (discountValue / 100) : discountValue;
  const safeDiscountAmount = Math.min(Number.isFinite(discountAmount) ? discountAmount : 0, grossAmount);
  const finalTotal = Math.max(grossAmount - safeDiscountAmount, 0);
  const installmentAmount =
    installmentCount > 1
      ? manualInstallmentAmount > 0
        ? manualInstallmentAmount
        : finalTotal / installmentCount
      : finalTotal;
  const estimatedCost = saleItems.reduce((sum, item) => {
    const product = payload.products.find((entry) => entry.id === item.productId);
    return sum + (product?.cost_price ?? 0) * item.quantity;
  }, 0);
  const estimatedProfit = finalTotal - estimatedCost - paymentFeeValue;
  const selectedSale = useMemo(
    () => payload.salesHistory.find((sale) => sale.id === selectedSaleId) ?? payload.salesHistory[0] ?? null,
    [payload.salesHistory, selectedSaleId]
  );
  const recentSales = useMemo(() => payload.salesHistory.slice(0, 12), [payload.salesHistory]);

  function applyPayload(nextPayload: AdminStorePayload) {
    setPayload(nextPayload);

    const nextProduct =
      nextPayload.products.find((product) => product.id === selectedProductId) ??
      nextPayload.products[0] ??
      null;

    setSelectedProductId(nextProduct?.id ?? null);
    setSelectedVariationId(nextProduct?.variations[0]?.id ?? null);

    if (
      saleForm.customerSelection &&
      saleForm.customerSelection !== NEW_CUSTOMER_VALUE &&
      !nextPayload.customers.some((customer) => String(customer.id) === saleForm.customerSelection)
    ) {
      setSaleForm((current) => ({ ...current, customerSelection: "" }));
    }

    setSelectedSaleId((current) => {
      if (current && nextPayload.salesHistory.some((sale) => sale.id === current)) {
        return current;
      }

      return nextPayload.salesHistory[0]?.id ?? null;
    });
  }

  function chooseProduct(product: AdminProduct) {
    setSelectedProductId(product.id);
    setSelectedVariationId(product.variations[0]?.id ?? null);
    setSaleFeedback(`${product.name} selecionado.`);
    setSaleError(false);
  }

  function editProduct(product: AdminProduct) {
    setActiveSection("products");
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
        .map((variation) => `${variation.name} | ${variation.extra_price} | ${variation.stock}`)
        .join("\n"),
    });
    setAdminFeedback(`Editando ${product.name}.`);
    setAdminError(false);
  }

  function editCustomer(customerId: number) {
    const customer = payload.customers.find((item) => item.id === customerId);

    if (!customer) {
      return;
    }

    setActiveSection("customers");
    setCustomerForm({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      birthDay: customer.birth_day ? String(customer.birth_day) : "",
      birthMonth: customer.birth_month ? String(customer.birth_month) : "",
      source: customer.source,
    });
    setCustomerFeedback(`Editando ${customer.name}.`);
    setCustomerError(false);
  }

  function addItemToSale() {
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

    const quantityAlreadyAdded = saleItems
      .filter((item) => item.variationId === selectedVariation.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (parsedQuantity + quantityAlreadyAdded > selectedVariation.stock) {
      setSaleFeedback("Quantidade maior do que o estoque disponivel.");
      setSaleError(true);
      return;
    }

    setSaleItems((current) => {
      const existingItem = current.find((item) => item.variationId === selectedVariation.id);

      if (!existingItem) {
        return [
          ...current,
          {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            variationId: selectedVariation.id,
            variationName: selectedVariation.name,
            quantity: parsedQuantity,
            unitPrice: selectedVariation.display_price,
          },
        ];
      }

      return current.map((item) =>
        item.variationId === selectedVariation.id
          ? { ...item, quantity: item.quantity + parsedQuantity }
          : item
      );
    });

    setQuantity("1");
    setSaleFeedback(`${selectedProduct.name} adicionado a venda.`);
    setSaleError(false);
  }

  function removeSaleItem(variationId: number) {
    setSaleItems((current) => current.filter((item) => item.variationId !== variationId));
    setSaleFeedback("Item removido da venda.");
    setSaleError(false);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setAdminFeedback("Formulario limpo.");
    setAdminError(false);
  }

  function resetCustomerForm() {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFeedback("Formulario de cliente limpo.");
    setCustomerError(false);
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

      setSavingProduct(true);
      const response = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
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

  async function handleSaveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerForm.name.trim()) {
      setCustomerFeedback("Informe o nome do cliente.");
      setCustomerError(true);
      return;
    }

    try {
      setSavingCustomer(true);
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: typeof customerForm.id === "number" ? customerForm.id : undefined,
          name: customerForm.name,
          phone: customerForm.phone,
          notes: customerForm.notes,
          birthDay: customerForm.birthDay,
          birthMonth: customerForm.birthMonth,
          source: customerForm.source,
        }),
      });

      const nextPayload = await parseApiResponse<AdminCustomersApiResponse>(response);

      if (!response.ok || !nextPayload.success) {
        throw new Error(nextPayload.success ? "Nao foi possivel salvar o cliente." : nextPayload.error);
      }

      applyPayload(nextPayload);
      setCustomerForm(EMPTY_CUSTOMER_FORM);
      setCustomerFeedback(nextPayload.message);
      setCustomerError(false);
    } catch (caughtError) {
      setCustomerFeedback(getFriendlyError(caughtError, "Falha ao salvar o cliente."));
      setCustomerError(true);
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleToggleProduct(product: AdminProduct) {
    try {
      setTogglingProductId(product.id);
      const response = await fetch("/api/admin/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

    const parsedDiscountValue = Number(saleForm.discountValue || "0");
    const parsedPaymentFeeValue = Number(saleForm.paymentFeeValue || "0");
    const parsedInstallmentCount = Number(saleForm.installmentCount || "1");
    const parsedInstallmentAmount = Number(saleForm.installmentAmount || "0");
    const selectedCustomerId =
      saleForm.customerSelection &&
      saleForm.customerSelection !== NEW_CUSTOMER_VALUE
        ? Number(saleForm.customerSelection)
        : null;

    if (!saleItems.length) {
      setSaleFeedback("Adicione ao menos um item antes de salvar a venda.");
      setSaleError(true);
      return;
    }

    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue < 0) {
      setSaleFeedback("Informe um desconto valido.");
      setSaleError(true);
      return;
    }

    if (saleForm.discountType === "percent" && parsedDiscountValue > 100) {
      setSaleFeedback("O desconto percentual nao pode ser maior que 100%.");
      setSaleError(true);
      return;
    }

    if (Number.isNaN(parsedPaymentFeeValue) || parsedPaymentFeeValue < 0) {
      setSaleFeedback("Informe uma taxa de pagamento valida.");
      setSaleError(true);
      return;
    }

    if (!Number.isInteger(parsedInstallmentCount) || parsedInstallmentCount <= 0) {
      setSaleFeedback("Informe um parcelamento valido.");
      setSaleError(true);
      return;
    }

    if (Number.isNaN(parsedInstallmentAmount) || parsedInstallmentAmount < 0) {
      setSaleFeedback("Informe um valor de parcela valido.");
      setSaleError(true);
      return;
    }

    if (isCreatingCustomer && !saleForm.customerName.trim()) {
      setSaleFeedback("Informe o nome do novo cliente ou selecione um cliente existente.");
      setSaleError(true);
      return;
    }

    setSubmittingSale(true);

    try {
      const response = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          customerName: isCreatingCustomer ? saleForm.customerName : "",
          customerPhone: isCreatingCustomer ? saleForm.customerPhone : "",
          customerNotes: isCreatingCustomer ? saleForm.customerNotes : "",
          customerBirthDay:
            isCreatingCustomer && saleForm.customerBirthDay
              ? Number(saleForm.customerBirthDay)
              : null,
          customerBirthMonth:
            isCreatingCustomer && saleForm.customerBirthMonth
              ? Number(saleForm.customerBirthMonth)
              : null,
          customerSource: isCreatingCustomer ? saleForm.customerSource : "outro",
          paymentMethod: saleForm.paymentMethod,
          discountType: saleForm.discountType,
          discountValue: parsedDiscountValue,
          paymentFeeValue: parsedPaymentFeeValue,
          installmentCount: parsedInstallmentCount,
          installmentAmount: parsedInstallmentAmount,
          firstPaymentDate: saleForm.firstPaymentDate,
          saleNotes: saleForm.saleNotes,
          items: saleItems.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
          })),
        }),
      });

      const nextPayload = await parseApiResponse<AdminSalesApiResponse>(response);

      if (!response.ok || !nextPayload.success) {
        throw new Error(
          nextPayload.success ? "Nao foi possivel registrar a venda." : nextPayload.error
        );
      }

      applyPayload(nextPayload);
      setQuantity("1");
      setSaleItems([]);
      setSaleForm((current) => ({
        ...DEFAULT_SALE_FORM,
        paymentMethod: current.paymentMethod,
      }));
      setSaleFeedback(
        `Venda registrada: ${nextPayload.sale.itemCount} itens | total ${formatCurrency(
          nextPayload.sale.totalAmount
        )} | lucro ${formatCurrency(nextPayload.sale.totalProfit)}`
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

  const productBrowser = (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Catalogo</p>
          <h2>{activeSection === "sales" ? "Selecionar produtos para a venda" : "Produtos e estoque"}</h2>
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
        {!filteredProducts.length ? <div className="empty-state">Nenhum produto encontrado.</div> : null}

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
                    {product.active ? `${formatNumber(totalStock)} em estoque` : "Inativo"}
                  </span>
                </div>

                <p className="product-copy">{product.description || "Produto pronto para venda rapida."}</p>

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
                    {activeSection === "sales" ? "Usar na venda" : "Selecionar"}
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
                        ? "Desativar"
                        : "Reativar"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  const salesWorkspace = (
    <div className="admin-workspace admin-workspace--sales">
      <div className="admin-workspace__main">{productBrowser}</div>

      <aside className="sidebar">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Vendas</p>
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
              "Selecione um produto para iniciar a venda."
            )}
          </div>

          <form className="stack" onSubmit={handleSale}>
            <div className="sale-fields-group">
              <div className="section-heading section-heading--compact">
                <div>
                  <p className="section-kicker">Cliente</p>
                  <h3>Vincular cliente</h3>
                </div>
              </div>

              <label>
                <span>Cliente</span>
                <select
                  value={saleForm.customerSelection}
                  onChange={(event) =>
                    setSaleForm((current) => ({
                      ...current,
                      customerSelection: event.target.value,
                      customerName: event.target.value === NEW_CUSTOMER_VALUE ? current.customerName : "",
                      customerPhone: event.target.value === NEW_CUSTOMER_VALUE ? current.customerPhone : "",
                      customerNotes: event.target.value === NEW_CUSTOMER_VALUE ? current.customerNotes : "",
                      customerBirthDay:
                        event.target.value === NEW_CUSTOMER_VALUE ? current.customerBirthDay : "",
                      customerBirthMonth:
                        event.target.value === NEW_CUSTOMER_VALUE ? current.customerBirthMonth : "",
                      customerSource:
                        event.target.value === NEW_CUSTOMER_VALUE ? current.customerSource : "outro",
                    }))
                  }
                >
                  <option value="">Balcao / sem cliente</option>
                  <option value={NEW_CUSTOMER_VALUE}>Cadastrar novo cliente</option>
                  {payload.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.phone ? ` - ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedExistingCustomer ? (
                <div className="customer-preview">
                  <strong>{selectedExistingCustomer.name}</strong>
                  <span>{selectedExistingCustomer.phone || "Sem telefone cadastrado."}</span>
                  <span>
                    {`Aniversario ${formatBirthday(
                      selectedExistingCustomer.birth_day,
                      selectedExistingCustomer.birth_month
                    )}`}
                    {" | "}
                    {formatCustomerSource(selectedExistingCustomer.source)}
                  </span>
                </div>
              ) : null}

              {isCreatingCustomer ? (
                <div className="sale-fields-grid">
                  <label>
                    <span>Nome do novo cliente</span>
                    <input
                      type="text"
                      placeholder="Obrigatorio para cadastro rapido"
                      value={saleForm.customerName}
                      onChange={(event) =>
                        setSaleForm((current) => ({ ...current, customerName: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Telefone do cliente</span>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={saleForm.customerPhone}
                      onChange={(event) =>
                        setSaleForm((current) => ({ ...current, customerPhone: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Dia do aniversario</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex.: 12"
                      value={saleForm.customerBirthDay}
                      onChange={(event) =>
                        setSaleForm((current) => ({ ...current, customerBirthDay: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Mes do aniversario</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Ex.: 5"
                      value={saleForm.customerBirthMonth}
                      onChange={(event) =>
                        setSaleForm((current) => ({ ...current, customerBirthMonth: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Origem do cliente</span>
                    <select
                      value={saleForm.customerSource}
                      onChange={(event) =>
                        setSaleForm((current) => ({
                          ...current,
                          customerSource: event.target.value as CustomerSource,
                        }))
                      }
                    >
                      {CUSTOMER_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sale-fields-grid__full">
                    <span>Observacoes do cliente</span>
                    <textarea
                      rows={2}
                      placeholder="Opcional"
                      value={saleForm.customerNotes}
                      onChange={(event) =>
                        setSaleForm((current) => ({ ...current, customerNotes: event.target.value }))
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="sale-fields-group">
              <div className="section-heading section-heading--compact">
                <div>
                  <p className="section-kicker">Itens</p>
                  <h3>Montar pedido</h3>
                </div>
              </div>

              <label>
                <span>Produto / variacao</span>
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

              <div className="sale-fields-grid">
                <label>
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>

                <div className="sale-actions-inline">
                  <button className="secondary-button" type="button" onClick={addItemToSale} disabled={!selectedVariation}>
                    Adicionar item
                  </button>
                </div>
              </div>

              <div className="sale-cart">
                <div className="sale-cart__header">
                  <strong>Itens da venda</strong>
                  <span>{formatNumber(saleItems.length)} linhas</span>
                </div>

                {!saleItems.length ? (
                  <div className="empty-state">Adicione produtos para montar a venda.</div>
                ) : (
                  <div className="sale-cart__list">
                    {saleItems.map((item) => (
                      <article key={item.variationId} className="sale-cart__item">
                        <div className="sale-cart__copy">
                          <strong>{item.productName}</strong>
                          <span>
                            {item.variationName} | {formatNumber(item.quantity)} x {formatCurrency(item.unitPrice)}
                          </span>
                        </div>
                        <div className="sale-cart__meta">
                          <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => removeSaleItem(item.variationId)}
                          >
                            Remover
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sale-fields-group">
              <div className="section-heading section-heading--compact">
                <div>
                  <p className="section-kicker">Pagamento</p>
                  <h3>Finalizar venda</h3>
                </div>
              </div>

              <div className="sale-fields-grid">
                <label>
                  <span>Forma de pagamento</span>
                  <select
                    value={saleForm.paymentMethod}
                    onChange={(event) =>
                      setSaleForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value as SaleFormState["paymentMethod"],
                      }))
                    }
                  >
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="debito">Debito</option>
                    <option value="credito">Credito</option>
                  </select>
                </label>

                <label>
                  <span>Tipo de desconto</span>
                  <select
                    value={saleForm.discountType}
                    onChange={(event) =>
                      setSaleForm((current) => ({
                        ...current,
                        discountType: event.target.value as SaleFormState["discountType"],
                      }))
                    }
                  >
                    <option value="amount">Valor</option>
                    <option value="percent">Percentual</option>
                  </select>
                </label>

                <label>
                  <span>Valor do desconto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleForm.discountValue}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, discountValue: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>Taxa de pagamento</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleForm.paymentFeeValue}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, paymentFeeValue: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>Quantidade de parcelas</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={saleForm.installmentCount}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, installmentCount: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>Valor da parcela</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleForm.installmentAmount}
                    placeholder={installmentCount > 1 ? "Calculo automatico se vazio" : "Pagamento unico"}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, installmentAmount: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>Data do primeiro pagamento</span>
                  <input
                    type="date"
                    value={saleForm.firstPaymentDate}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, firstPaymentDate: event.target.value }))
                    }
                  />
                </label>

                <label className="sale-fields-grid__full">
                  <span>Observacoes da venda</span>
                  <textarea
                    rows={3}
                    placeholder="Opcional"
                    value={saleForm.saleNotes}
                    onChange={(event) =>
                      setSaleForm((current) => ({ ...current, saleNotes: event.target.value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="profit-box">
              <span>Resumo da venda</span>
              <strong>{formatCurrency(finalTotal)}</strong>
              <small>
                {`Subtotal ${formatCurrency(grossAmount)} | desconto ${formatCurrency(
                  safeDiscountAmount
                )} | taxa ${formatCurrency(paymentFeeValue)}`}
              </small>
              <small>
                {`Pagamento ${installmentCount > 1 ? `${installmentCount}x de ${formatCurrency(installmentAmount)}` : "a vista"} | primeiro vencimento ${saleForm.firstPaymentDate || "nao informado"}`}
              </small>
              <small>
                {saleItems.length
                  ? `Custo estimado ${formatCurrency(estimatedCost)} | lucro estimado ${formatCurrency(estimatedProfit)}`
                  : "Adicione itens para calcular a venda"}
              </small>
            </div>

            <button className="primary-button" type="submit" disabled={submittingSale || !saleItems.length}>
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
      </aside>
    </div>
  );

  const productsWorkspace = (
    <div className="admin-workspace">
      <div className="admin-workspace__main">{productBrowser}</div>

      <aside className="sidebar">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Produtos</p>
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
                      : "Nenhuma subcategoria disponivel"}
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
    </div>
  );

  const customersWorkspace = (
    <div className="admin-workspace">
      <div className="admin-workspace__main">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Clientes</p>
              <h2>Clientes cadastrados</h2>
            </div>
            <div className="stats-inline">{payload.customers.length} clientes</div>
          </div>

          <div className="sales-history">
            {!payload.customers.length ? (
              <div className="empty-state">Nenhum cliente cadastrado ainda.</div>
            ) : (
              payload.customers.map((customer) => (
                <article key={customer.id} className="history-card">
                  <div className="history-row">
                    <strong>{customer.name}</strong>
                    <button className="ghost-button" type="button" onClick={() => editCustomer(customer.id)}>
                      Editar
                    </button>
                  </div>
                  <div className="history-row muted">
                    <span>{customer.phone || "Sem telefone"}</span>
                    <span>{formatCustomerSource(customer.source)}</span>
                  </div>
                  <div className="history-row muted">
                    <span>{formatBirthday(customer.birth_day, customer.birth_month)}</span>
                  </div>
                  <p className="history-items">{customer.notes || "Sem observacoes."}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <aside className="sidebar">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Cadastro</p>
              <h2>Adicionar ou editar cliente</h2>
            </div>
          </div>

          <form className="stack" onSubmit={handleSaveCustomer}>
            <label>
              <span>Nome do cliente</span>
              <input
                type="text"
                placeholder="Ex.: Maria Oliveira"
                value={customerForm.name}
                onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Telefone</span>
              <input
                type="text"
                placeholder="(31) 99999-9999"
                value={customerForm.phone}
                onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>

            <label>
              <span>Dia do aniversario</span>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 12"
                value={customerForm.birthDay}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, birthDay: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Mes do aniversario</span>
              <input
                type="number"
                min="1"
                max="12"
                placeholder="Ex.: 5"
                value={customerForm.birthMonth}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, birthMonth: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Origem do cliente</span>
              <select
                value={customerForm.source}
                onChange={(event) =>
                  setCustomerForm((current) => ({
                    ...current,
                    source: event.target.value as CustomerSource,
                  }))
                }
              >
                {CUSTOMER_SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Observacoes</span>
              <textarea
                rows={4}
                placeholder="Opcional"
                value={customerForm.notes}
                onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="button-row">
              <button className="primary-button" type="submit" disabled={savingCustomer}>
                {savingCustomer ? "Salvando..." : "Salvar cliente"}
              </button>
              <button className="ghost-button" type="button" onClick={resetCustomerForm}>
                Limpar
              </button>
            </div>
          </form>

          <p className={`feedback ${customerError ? "error" : ""}`}>{customerFeedback}</p>
        </section>
      </aside>
    </div>
  );

  const dashboardWorkspace = (
    <div className="admin-workspace">
      <div className="admin-workspace__main">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Indicadores</p>
              <h2>Resumo do negocio</h2>
            </div>
          </div>

          <div className="admin-dashboard-grid">
            <article className="stat-card">
              <span>Faturamento hoje</span>
              <strong>{formatCurrency(payload.dashboard.revenueToday)}</strong>
              <small>Faturamento geral {formatCurrency(payload.dashboard.revenueOverall)}</small>
            </article>
            <article className="stat-card accent">
              <span>Lucro hoje</span>
              <strong>{formatCurrency(payload.dashboard.profitToday)}</strong>
              <small>Lucro geral {formatCurrency(payload.dashboard.profitOverall)}</small>
            </article>
            <article className="stat-card">
              <span>Vendas hoje</span>
              <strong>{formatNumber(payload.dashboard.salesToday)}</strong>
              <small>{formatNumber(payload.dashboard.salesOverall)} pedidos no total</small>
            </article>
            <article className="stat-card">
              <span>Ticket medio hoje</span>
              <strong>{formatCurrency(payload.dashboard.ticketAverageToday)}</strong>
              <small>Ticket geral {formatCurrency(payload.dashboard.ticketAverageOverall)}</small>
            </article>
            <article className="stat-card">
              <span>Descontos concedidos</span>
              <strong>{formatCurrency(payload.dashboard.totalDiscounts)}</strong>
              <small>Impacto acumulado nas vendas</small>
            </article>
            <article className="stat-card">
              <span>Taxas de pagamento</span>
              <strong>{formatCurrency(payload.dashboard.totalPaymentFees)}</strong>
              <small>Custos de cartao e maquininha</small>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Produtos</p>
              <h2>Insights por produto</h2>
            </div>
          </div>

          <div className="insight-grid">
            <article className="insight-card">
              <div className="insight-card__header">
                <strong>Top 5 por quantidade</strong>
                <span>Itens vendidos</span>
              </div>
              {!payload.dashboard.topProductsByQuantity.length ? (
                <div className="empty-state">Sem vendas para analisar ainda.</div>
              ) : (
                <div className="metric-list">
                  {payload.dashboard.topProductsByQuantity.map((product, index) => (
                    <article key={`qty-${product.product_id}-${index}`} className="metric-row">
                      <div className="metric-row__copy">
                        <strong>{product.product_name}</strong>
                        <span>{formatCurrency(product.revenue)} em receita</span>
                      </div>
                      <strong>{formatNumber(product.quantity_sold)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="insight-card">
              <div className="insight-card__header">
                <strong>Top 5 por faturamento</strong>
                <span>Receita por produto</span>
              </div>
              {!payload.dashboard.topProductsByRevenue.length ? (
                <div className="empty-state">Sem vendas para analisar ainda.</div>
              ) : (
                <div className="metric-list">
                  {payload.dashboard.topProductsByRevenue.map((product, index) => (
                    <article key={`revenue-${product.product_id}-${index}`} className="metric-row">
                      <div className="metric-row__copy">
                        <strong>{product.product_name}</strong>
                        <span>{formatNumber(product.quantity_sold)} unidades vendidas</span>
                      </div>
                      <strong>{formatCurrency(product.revenue)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="insight-card">
              <div className="insight-card__header">
                <strong>Top 5 por lucro</strong>
                <span>Produtos mais rentaveis</span>
              </div>
              {!payload.dashboard.topProductsByProfit.length ? (
                <div className="empty-state">Sem vendas para analisar ainda.</div>
              ) : (
                <div className="metric-list">
                  {payload.dashboard.topProductsByProfit.map((product, index) => (
                    <article key={`profit-${product.product_id}-${index}`} className="metric-row">
                      <div className="metric-row__copy">
                        <strong>{product.product_name}</strong>
                        <span>{formatCurrency(product.revenue)} em receita</span>
                      </div>
                      <strong>{formatCurrency(product.profit)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Aniversariantes</p>
              <h2>Aniversariantes do dia</h2>
            </div>
          </div>

          {!payload.dashboard.birthdaysToday.length ? (
            <div className="empty-state">Nenhum aniversariante cadastrado para hoje.</div>
          ) : (
            <div className="metric-list">
              {payload.dashboard.birthdaysToday.map((customer) => {
                const whatsappLink = buildWhatsAppLink(
                  customer.phone,
                  "Olá, passando para te desejar um feliz aniversário! 🎉"
                );

                return (
                  <article key={customer.id} className="metric-row">
                    <div className="metric-row__copy">
                      <strong>{customer.name}</strong>
                      <span>{customer.phone || "Sem telefone cadastrado"}</span>
                    </div>
                    {whatsappLink ? (
                      <a
                        className="secondary-button button-link"
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Enviar mensagem no WhatsApp
                      </a>
                    ) : (
                      <span className="stats-inline">Sem WhatsApp</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Clientes</p>
              <h2>Melhores clientes</h2>
            </div>
          </div>

          {!payload.dashboard.topCustomers.length ? (
            <div className="empty-state">Cadastre clientes e registre vendas para acompanhar recorrencia.</div>
          ) : (
            <div className="metric-list">
              {payload.dashboard.topCustomers.map((customer, index) => (
                <article key={`${customer.customer_name}-${index}`} className="metric-row">
                  <div className="metric-row__copy">
                    <strong>{customer.customer_name}</strong>
                    <span>
                      {formatNumber(customer.purchase_count)} compras | {formatNumber(customer.items_purchased)} itens
                    </span>
                  </div>
                  <strong>{formatCurrency(customer.total_spent)}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="sidebar">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Historico de vendas</p>
              <h2>Pedidos recentes</h2>
            </div>
            <div className="stats-inline">{formatNumber(payload.salesHistory.length)} vendas</div>
          </div>

          <div className="sales-history">
            {!recentSales.length ? (
              <div className="empty-state">Nenhuma venda registrada ainda.</div>
            ) : (
              recentSales.map((sale) => (
                <button
                  key={sale.id}
                  className={`history-card history-card--interactive ${selectedSale?.id === sale.id ? "selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <div className="history-row">
                    <strong>{formatSaleDate(sale.created_at)}</strong>
                    <span>{formatCurrency(sale.total_amount)}</span>
                  </div>
                  <div className="history-row muted">
                    <span>{sale.customer_name || "Balcao / sem cliente"}</span>
                    <span>{formatPaymentMethod(sale.payment_method)}</span>
                  </div>
                  <div className="history-row muted">
                    <span>{formatNumber(sale.item_count)} itens</span>
                    <span>Lucro {formatCurrency(sale.total_profit)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Detalhes</p>
              <h2>Venda selecionada</h2>
            </div>
          </div>

          {!selectedSale ? (
            <div className="empty-state">Selecione uma venda para ver os detalhes.</div>
          ) : (
            <div className="sale-detail">
              <div className="sale-detail__summary">
                <strong>{formatSaleDate(selectedSale.created_at)}</strong>
                <span>{selectedSale.customer_name || "Balcao / sem cliente"}</span>
                <span>{formatPaymentMethod(selectedSale.payment_method)}</span>
                <span>
                  {selectedSale.installment_count > 1
                    ? `${selectedSale.installment_count}x de ${formatCurrency(selectedSale.installment_amount)}`
                    : "Pagamento unico"}
                </span>
                <span>
                  Primeiro pagamento: {selectedSale.first_payment_date || "nao informado"}
                </span>
              </div>

              <div className="sale-detail__items">
                {selectedSale.items.map((item, index) => (
                  <article key={`${selectedSale.id}-${item.product_id}-${index}`} className="sale-detail__item">
                    <div className="sale-detail__copy">
                      <strong>
                        {item.product_name}
                        {item.variation_name ? ` - ${item.variation_name}` : ""}
                      </strong>
                      <span>
                        {formatNumber(item.quantity)} x {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                    <strong>{formatCurrency(item.subtotal)}</strong>
                  </article>
                ))}
              </div>

              <div className="sale-detail__totals">
                <div className="history-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(selectedSale.subtotal_amount)}</strong>
                </div>
                <div className="history-row">
                  <span>Desconto</span>
                  <strong>{formatCurrency(selectedSale.discount_amount)}</strong>
                </div>
                <div className="history-row">
                  <span>Taxa de pagamento</span>
                  <strong>{formatCurrency(selectedSale.payment_fee_value)}</strong>
                </div>
                <div className="history-row">
                  <span>Total final</span>
                  <strong>{formatCurrency(selectedSale.total_amount)}</strong>
                </div>
              </div>

              <div className="profit-box sale-detail__profit">
                <span>Lucro da venda</span>
                <strong>{formatCurrency(selectedSale.total_profit)}</strong>
                <small>{selectedSale.item_names.join(", ") || "Itens nao encontrados."}</small>
                {selectedSale.sale_notes ? <small>Observacoes: {selectedSale.sale_notes}</small> : null}
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );

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
                Gestao de catalogo, controle de estoque, vendas presenciais com multiplos itens e operacao interna em um painel mais organizado.
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

      <section className="admin-section-bar">
        <div className="admin-section-bar__tabs">
          <button
            className={`admin-section-tab ${activeSection === "dashboard" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("dashboard")}
          >
            Relatorios
          </button>
          <button
            className={`admin-section-tab ${activeSection === "products" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("products")}
          >
            Produtos
          </button>
          <button
            className={`admin-section-tab ${activeSection === "sales" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("sales")}
          >
            Vendas
          </button>
          <button
            className={`admin-section-tab ${activeSection === "customers" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSection("customers")}
          >
            Clientes
          </button>
        </div>
        <p className="admin-section-bar__hint">
          {activeSection === "dashboard"
            ? "Acompanhe faturamento, lucro, descontos, taxas, produtos mais fortes e o historico recente de vendas."
            : activeSection === "products"
            ? "Gerencie produtos, precos, estoque, categorias e status em uma area dedicada."
            : activeSection === "sales"
              ? "Monte uma venda com varios itens, escolha ou cadastre rapidamente um cliente e finalize com um resumo claro."
              : "Cadastre clientes de forma simples para agilizar o atendimento e apoiar relatorios futuros."}
        </p>
      </section>

      {activeSection === "dashboard"
        ? dashboardWorkspace
        : activeSection === "products"
        ? productsWorkspace
        : activeSection === "sales"
          ? salesWorkspace
          : customersWorkspace}
    </div>
  );
}
