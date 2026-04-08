import type {
  AdminCustomer,
  AdminDashboardMetrics,
  AdminProduct,
  AdminSaleHistoryItem,
  AdminStorePayload,
  CatalogPayload,
  CategoryOption,
  CustomerSource,
  CustomerInput,
  ProductInput,
  SaleInput,
  SubcategoryOption,
  Variation,
} from "@/types/store";
import { supabaseRequest } from "@/lib/supabase";

type ProductRow = {
  id: number;
  name: string;
  category_id: number;
  subcategory_id: number | null;
  description: string;
  cost_price: number;
  sale_price: number;
  image_url: string;
  active: boolean;
  category: { id: number; name: string; slug: string; storefront_group: string | null } | null;
  subcategory: { id: number; name: string; slug: string; category_id: number } | null;
};

type ProductSummaryRow = {
  id: number;
  name: string;
  description: string;
  sale_price: number;
  image_url: string;
  active: boolean;
  is_featured: boolean;
  category: { id: number; name: string; slug: string; storefront_group: string | null } | null;
  subcategory: { id: number; name: string; slug: string; category_id: number } | null;
};

type ProductSaleRow = {
  id: number;
  name: string;
  cost_price: number;
  sale_price: number;
};

type VariantRow = {
  id: number;
  product_id: number;
  name: string;
  stock: number;
  extra_price: number;
};

type SaleRow = {
  id: number;
  created_at: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  discount_type: string | null;
  discount_value: number | null;
  payment_fee_value: number | null;
  installment_count: number | null;
  installment_amount: number | null;
  first_payment_date: string | null;
  sale_notes: string | null;
  total_amount: number;
  total_profit: number;
};

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string | null;
  notes: string | null;
  birth_day: number | null;
  birth_month: number | null;
  source: string | null;
};

type SaleItemHistoryRow = {
  sale_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  unit_price: number;
  cost_price_snapshot: number;
};

type CategoryRow = CategoryOption;
type SubcategoryRow = SubcategoryOption;

async function getCustomers(): Promise<AdminCustomer[]> {
  const customers = await supabaseRequest<CustomerRow[]>(
    "customers?select=id,name,phone,notes,birth_day,birth_month,source&order=created_at.desc"
  );

  return customers
    .map((customer) => ({
      id: Number(customer.id),
      name: (customer.name ?? "").trim(),
      phone: (customer.phone ?? "").trim(),
      notes: (customer.notes ?? "").trim(),
      birth_day: customer.birth_day === null ? null : Number(customer.birth_day),
      birth_month: customer.birth_month === null ? null : Number(customer.birth_month),
      source: normalizeCustomerSource(customer.source),
    }))
    .filter((customer) => customer.name);
}

function normalizeCustomerSource(value: string | null | undefined): CustomerSource {
  const normalized = (value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "familiar":
    case "amigo":
    case "indicacao":
    case "instagram":
    case "whatsapp":
    case "feira":
    case "cliente_recorrente":
      return normalized;
    default:
      return "outro";
  }
}

function getSaoPauloDayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getTodaySaoPauloKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMonthDayKey(day: number | null, month: number | null) {
  if (!day || !month) {
    return "";
  }

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTodayMonthDayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return month && day ? `${month}-${day}` : "";
}

function buildVariation(productSalePrice: number, row: VariantRow): Variation {
  return {
    id: Number(row.id),
    product_id: Number(row.product_id),
    name: row.name,
    stock: Number(row.stock),
    extra_price: Number(row.extra_price),
    display_price: Number(productSalePrice) + Number(row.extra_price),
  };
}

async function getProductsWithVariants() {
  const [products, variantRows] = await Promise.all([
    supabaseRequest<ProductRow[]>(
      "products?select=id,name,category_id,subcategory_id,description,cost_price,sale_price,image_url,active,category:categories!products_category_id_fkey(id,name,slug,storefront_group),subcategory:subcategories!products_subcategory_id_fkey(id,category_id,name,slug)&order=created_at.desc"
    ),
    supabaseRequest<VariantRow[]>(
      "product_variants?select=id,product_id,name,stock,extra_price&order=created_at.asc"
    ),
  ]);

  const salePriceByProductId = new Map<number, number>();
  for (const product of products) {
    salePriceByProductId.set(Number(product.id), Number(product.sale_price));
  }

  const variantsByProductId = new Map<number, Variation[]>();

  for (const row of variantRows) {
    const productId = Number(row.product_id);
    const bucket = variantsByProductId.get(productId) ?? [];
    bucket.push(buildVariation(salePriceByProductId.get(productId) ?? 0, row));
    variantsByProductId.set(productId, bucket);
  }

  const items: AdminProduct[] = products.map((product) => ({
    id: Number(product.id),
    name: product.name,
    category_id: Number(product.category_id),
    category_name: product.category?.name ?? "Sem categoria",
    category_slug: product.category?.slug ?? null,
    storefront_group: product.category?.storefront_group ?? null,
    subcategory_id: product.subcategory ? Number(product.subcategory.id) : null,
    subcategory_name: product.subcategory?.name ?? null,
    description: product.description,
    cost_price: Number(product.cost_price),
    sale_price: Number(product.sale_price),
    image_url: product.image_url,
    active: Boolean(product.active),
    variations: variantsByProductId.get(Number(product.id)) ?? [],
  }));

  return items;
}

export async function getCatalogPayload(): Promise<CatalogPayload> {
  const [products, variantRows] = await Promise.all([
    supabaseRequest<ProductSummaryRow[]>(
      "products?select=id,name,description,sale_price,image_url,active,is_featured,category:categories!products_category_id_fkey(id,name,slug,storefront_group),subcategory:subcategories!products_subcategory_id_fkey(id,category_id,name,slug)&active=eq.true&order=created_at.desc"
    ),
    supabaseRequest<VariantRow[]>(
      "product_variants?select=id,product_id,name,stock,extra_price&order=created_at.asc"
    ),
  ]);

  const variantRowsByProductId = new Map<number, VariantRow[]>();
  for (const row of variantRows) {
    const productId = Number(row.product_id);
    const bucket = variantRowsByProductId.get(productId) ?? [];
    bucket.push(row);
    variantRowsByProductId.set(productId, bucket);
  }

  return {
    products: products.map((product) => {
      const variants = (variantRowsByProductId.get(Number(product.id)) ?? []).map((row) =>
        buildVariation(Number(product.sale_price), row)
      );
      const prices = variants.map((variant) => Number(variant.display_price));
      const fallbackPrice = Number(product.sale_price);

      return {
        id: Number(product.id),
        name: product.name,
        category_name: product.category?.name ?? "Sem categoria",
        category_slug: product.category?.slug ?? null,
        storefront_group: product.category?.storefront_group ?? null,
        subcategory_name: product.subcategory?.name ?? null,
        description: product.description,
        image_url: product.image_url,
        min_sale_price: prices.length ? Math.min(...prices) : fallbackPrice,
        max_sale_price: prices.length ? Math.max(...prices) : fallbackPrice,
        is_featured: Boolean(product.is_featured),
      };
    }),
  };
}

export async function getAdminStorePayload(): Promise<AdminStorePayload> {
  const [products, customers, sales, categories, subcategories] = await Promise.all([
    getProductsWithVariants(),
    getCustomers(),
    supabaseRequest<SaleRow[]>(
      "sales?select=id,created_at,customer_id,customer_name,customer_phone,payment_method,discount_type,discount_value,payment_fee_value,installment_count,installment_amount,first_payment_date,sale_notes,total_amount,total_profit&order=created_at.desc"
    ),
    supabaseRequest<CategoryRow[]>("categories?select=id,name,slug,storefront_group&order=name.asc"),
    supabaseRequest<SubcategoryRow[]>("subcategories?select=id,category_id,name,slug&order=name.asc"),
  ]);

  const salesHistory = await getSalesHistory(sales);
  const dashboard = buildDashboardMetrics(salesHistory, customers);

  return {
    products,
    customers,
    categories: categories.map((category) => ({
      id: Number(category.id),
      name: category.name,
      slug: category.slug,
      storefront_group: category.storefront_group ?? null,
    })),
    subcategories: subcategories.map((subcategory) => ({
      id: Number(subcategory.id),
      category_id: Number(subcategory.category_id),
      name: subcategory.name,
      slug: subcategory.slug,
    })),
    summary: {
      productCount: products.length,
      variationCount: products.reduce((sum, product) => sum + product.variations.length, 0),
      totalStock: products.reduce(
        (sum, product) =>
          sum + product.variations.reduce((variantSum, variant) => variantSum + Number(variant.stock), 0),
        0
      ),
      totalRevenue: sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0),
      totalProfit: sales.reduce((sum, sale) => sum + Number(sale.total_profit), 0),
      salesCount: sales.length,
    },
    dashboard,
    salesHistory,
  };
}

async function getSalesHistory(sales: SaleRow[]): Promise<AdminSaleHistoryItem[]> {
  if (!sales.length) {
    return [];
  }

  const saleIds = sales.map((sale) => Number(sale.id));
  const saleFilter = saleIds.join(",");

  const saleItems = await supabaseRequest<SaleItemHistoryRow[]>(
    `sale_items?select=sale_id,product_id,variant_id,quantity,unit_price,cost_price_snapshot&sale_id=in.(${saleFilter})`
  );

  const productIds = Array.from(new Set(saleItems.map((item) => Number(item.product_id))));
  const variantIds = Array.from(
    new Set(saleItems.map((item) => item.variant_id).filter((variantId): variantId is number => variantId !== null))
  );

  const [productRows, variantRows] = await Promise.all([
    productIds.length
      ? supabaseRequest<Array<{ id: number; name: string }>>(
          `products?select=id,name&id=in.(${productIds.join(",")})`
        )
      : Promise.resolve([]),
    variantIds.length
      ? supabaseRequest<Array<{ id: number; name: string }>>(
          `product_variants?select=id,name&id=in.(${variantIds.join(",")})`
        )
      : Promise.resolve([]),
  ]);

  const productNameById = new Map(productRows.map((product) => [Number(product.id), product.name]));
  const variantNameById = new Map(variantRows.map((variant) => [Number(variant.id), variant.name]));
  const saleItemsBySaleId = new Map<number, SaleItemHistoryRow[]>();

  for (const item of saleItems) {
    const saleId = Number(item.sale_id);
    const bucket = saleItemsBySaleId.get(saleId) ?? [];
    bucket.push(item);
    saleItemsBySaleId.set(saleId, bucket);
  }

  return sales.map((sale) => {
    const items = saleItemsBySaleId.get(Number(sale.id)) ?? [];
    const subtotalAmount = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    );
    const itemNames = items.map((item) => {
      const productName = productNameById.get(Number(item.product_id)) ?? "Produto";
      const variantName =
        item.variant_id !== null ? variantNameById.get(Number(item.variant_id)) : undefined;

      return variantName ? `${productName} - ${variantName}` : productName;
    });

    return {
      id: Number(sale.id),
      created_at: sale.created_at,
      subtotal_amount: subtotalAmount,
      discount_amount: Math.max(subtotalAmount - Number(sale.total_amount), 0),
      payment_fee_value: Number(sale.payment_fee_value ?? 0),
      installment_count: Math.max(Number(sale.installment_count ?? 1), 1),
      installment_amount: Number(sale.installment_amount ?? sale.total_amount ?? 0),
      first_payment_date: sale.first_payment_date ?? null,
      total_amount: Number(sale.total_amount),
      total_profit: Number(sale.total_profit),
      customer_name: sale.customer_name?.trim() || null,
      customer_phone: sale.customer_phone?.trim() || null,
      payment_method: sale.payment_method?.trim() || null,
      sale_notes: sale.sale_notes?.trim() || null,
      item_count: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      item_names: itemNames,
      items: items.map((item) => ({
        product_id: Number(item.product_id),
        product_name: productNameById.get(Number(item.product_id)) ?? "Produto",
        variation_name:
          item.variant_id !== null ? variantNameById.get(Number(item.variant_id)) ?? null : null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        cost_price_snapshot: Number(item.cost_price_snapshot),
        subtotal: Number(item.quantity) * Number(item.unit_price),
      })),
    };
  });
}

function buildDashboardMetrics(
  salesHistory: AdminSaleHistoryItem[],
  customers: AdminCustomer[]
): AdminDashboardMetrics {
  const todayKey = getTodaySaoPauloKey();
  const todayMonthDayKey = getTodayMonthDayKey();
  const todaySales = salesHistory.filter((sale) => getSaoPauloDayKey(sale.created_at) === todayKey);

  const totalRevenueToday = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalRevenueOverall = salesHistory.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfitToday = todaySales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalProfitOverall = salesHistory.reduce((sum, sale) => sum + sale.total_profit, 0);
  const salesCountToday = todaySales.length;
  const salesCountOverall = salesHistory.length;
  const totalDiscounts = salesHistory.reduce((sum, sale) => sum + sale.discount_amount, 0);
  const totalPaymentFees = salesHistory.reduce((sum, sale) => sum + sale.payment_fee_value, 0);

  const productMetrics = new Map<
    string,
    {
      product_id: number;
      product_name: string;
      quantity_sold: number;
      revenue: number;
      profit: number;
    }
  >();
  const customerMetrics = new Map<
    string,
    {
      customer_id: number | null;
      customer_name: string;
      total_spent: number;
      purchase_count: number;
      items_purchased: number;
    }
  >();

  for (const sale of salesHistory) {
    const saleSubtotal = sale.subtotal_amount || 0;
    const saleDiscount = sale.discount_amount || 0;
    const saleFee = sale.payment_fee_value || 0;

    for (const item of sale.items) {
      const lineShare = saleSubtotal > 0 ? item.subtotal / saleSubtotal : 0;
      const allocatedDiscount = saleDiscount * lineShare;
      const allocatedFee = saleFee * lineShare;
      const lineRevenue = item.subtotal - allocatedDiscount;
      const lineCost = item.cost_price_snapshot * item.quantity;

      const productKey = item.product_name;
      const currentProduct = productMetrics.get(productKey) ?? {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity_sold: 0,
        revenue: 0,
        profit: 0,
      };

      currentProduct.quantity_sold += item.quantity;
      currentProduct.revenue += lineRevenue;
      currentProduct.profit += lineRevenue - allocatedFee - lineCost;
      productMetrics.set(productKey, currentProduct);
    }

    if (sale.customer_name) {
      const customerKey = sale.customer_name.toLowerCase();
      const currentCustomer = customerMetrics.get(customerKey) ?? {
        customer_id: null,
        customer_name: sale.customer_name,
        total_spent: 0,
        purchase_count: 0,
        items_purchased: 0,
      };

      currentCustomer.total_spent += sale.total_amount;
      currentCustomer.purchase_count += 1;
      currentCustomer.items_purchased += sale.item_count;
      customerMetrics.set(customerKey, currentCustomer);
    }
  }

  const toSortedTopFive = <T,>(items: T[], getter: (item: T) => number) =>
    [...items].sort((left, right) => getter(right) - getter(left)).slice(0, 5);

  const birthdaysToday = customers
    .filter(
      (customer) => getMonthDayKey(customer.birth_day, customer.birth_month) === todayMonthDayKey
    )
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    }))
    .slice(0, 10);

  return {
    revenueToday: totalRevenueToday,
    revenueOverall: totalRevenueOverall,
    profitToday: totalProfitToday,
    profitOverall: totalProfitOverall,
    salesToday: salesCountToday,
    salesOverall: salesCountOverall,
    ticketAverageToday: salesCountToday ? totalRevenueToday / salesCountToday : 0,
    ticketAverageOverall: salesCountOverall ? totalRevenueOverall / salesCountOverall : 0,
    totalDiscounts,
    totalPaymentFees,
    topProductsByQuantity: toSortedTopFive(Array.from(productMetrics.values()), (item) => item.quantity_sold),
    topProductsByRevenue: toSortedTopFive(Array.from(productMetrics.values()), (item) => item.revenue),
    topProductsByProfit: toSortedTopFive(Array.from(productMetrics.values()), (item) => item.profit),
    topCustomers: toSortedTopFive(Array.from(customerMetrics.values()), (item) => item.total_spent),
    birthdaysToday,
  };
}

export async function saveProduct(input: ProductInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Informe o nome do produto.");
  }

  if (!input.variations.length) {
    throw new Error("Adicione ao menos uma variacao.");
  }

  if (Number.isNaN(input.costPrice) || input.costPrice < 0) {
    throw new Error("Informe um preco de custo valido.");
  }

  if (Number.isNaN(input.salePrice) || input.salePrice < 0) {
    throw new Error("Informe um preco de venda valido.");
  }

  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    throw new Error("Selecione uma categoria valida.");
  }

  if (input.subcategoryId !== null && (!Number.isInteger(input.subcategoryId) || input.subcategoryId <= 0)) {
    throw new Error("Selecione uma subcategoria valida.");
  }

  const productBody = {
    name,
    category_id: input.categoryId,
    subcategory_id: input.subcategoryId,
    description: input.description.trim(),
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    image_url: input.imageUrl.trim(),
    active: input.active,
  };

  let productId = input.id;

  if (productId) {
    await supabaseRequest(`products?id=eq.${productId}`, {
      method: "PATCH",
      body: JSON.stringify(productBody),
      prefer: "return=minimal",
    });

    await supabaseRequest(`product_variants?product_id=eq.${productId}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  } else {
    const created = await supabaseRequest<Array<{ id: number }>>("products", {
      method: "POST",
      body: JSON.stringify(productBody),
      prefer: "return=representation",
    });

    productId = created[0]?.id;
  }

  if (!productId) {
    throw new Error("Nao foi possivel salvar o produto.");
  }

  await supabaseRequest("product_variants", {
    method: "POST",
    body: JSON.stringify(
      input.variations.map((variation) => ({
        product_id: productId,
        name: variation.name,
        stock: variation.stock,
        extra_price: variation.extraPrice,
      }))
    ),
    prefer: "return=minimal",
  });

  return productId;
}

export async function setProductActive(productId: number, active: boolean) {
  if (!productId) {
    throw new Error("Produto nao encontrado.");
  }

  await supabaseRequest(`products?id=eq.${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
    prefer: "return=minimal",
  });
}

export async function saveCustomer(input: CustomerInput) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const notes = input.notes.trim();
  const birthDay = input.birthDay;
  const birthMonth = input.birthMonth;
  const source = normalizeCustomerSource(input.source);

  if (!name) {
    throw new Error("Informe o nome do cliente.");
  }

  if (birthDay !== null && (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 31)) {
    throw new Error("Informe um dia de aniversario valido.");
  }

  if (birthMonth !== null && (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12)) {
    throw new Error("Informe um mes de aniversario valido.");
  }

  if ((birthDay === null) !== (birthMonth === null)) {
    throw new Error("Informe o dia e o mes do aniversario juntos.");
  }

  const customerBody = {
    name,
    phone: phone || null,
    notes: notes || null,
    birth_day: birthDay,
    birth_month: birthMonth,
    source,
  };

  if (input.id) {
    await supabaseRequest(`customers?id=eq.${input.id}`, {
      method: "PATCH",
      body: JSON.stringify(customerBody),
      prefer: "return=minimal",
    });

    return input.id;
  }

  const createdCustomers = await supabaseRequest<Array<{ id: number }>>("customers", {
    method: "POST",
    body: JSON.stringify([customerBody]),
    prefer: "return=representation",
  });

  const customerId = createdCustomers[0]?.id;

  if (!customerId) {
    throw new Error("Nao foi possivel salvar o cliente.");
  }

  return customerId;
}

export async function registerSale(input: SaleInput) {
  if (!input.items.length) {
    throw new Error("Adicione ao menos um item na venda.");
  }

  if (!["pix", "dinheiro", "debito", "credito"].includes(input.paymentMethod)) {
    throw new Error("Selecione uma forma de pagamento valida.");
  }

  if (!["amount", "percent"].includes(input.discountType)) {
    throw new Error("Selecione um tipo de desconto valido.");
  }

  if (Number.isNaN(input.discountValue) || input.discountValue < 0) {
    throw new Error("Informe um desconto valido.");
  }

  if (Number.isNaN(input.paymentFeeValue) || input.paymentFeeValue < 0) {
    throw new Error("Informe uma taxa de pagamento valida.");
  }

  if (!Number.isInteger(input.installmentCount) || input.installmentCount <= 0) {
    throw new Error("Informe um parcelamento valido.");
  }

  if (Number.isNaN(input.installmentAmount) || input.installmentAmount < 0) {
    throw new Error("Informe um valor de parcela valido.");
  }

  if (input.firstPaymentDate && Number.isNaN(new Date(`${input.firstPaymentDate}T12:00:00`).getTime())) {
    throw new Error("Informe uma data valida para o primeiro pagamento.");
  }

  const aggregatedItems = Array.from(
    input.items.reduce((map, item) => {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new Error("Selecione um produto valido.");
      }

      if (!Number.isInteger(item.variationId) || item.variationId <= 0) {
        throw new Error("Selecione uma variacao valida.");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Informe uma quantidade valida.");
      }

      const key = `${item.productId}:${item.variationId}`;
      const current = map.get(key);

      if (current) {
        current.quantity += item.quantity;
      } else {
        map.set(key, { ...item });
      }

      return map;
    }, new Map<string, { productId: number; variationId: number; quantity: number }>())
    .values()
  );

  const productIds = Array.from(new Set(aggregatedItems.map((item) => item.productId)));
  const variantIds = Array.from(new Set(aggregatedItems.map((item) => item.variationId)));

  const [products, variants] = await Promise.all([
    supabaseRequest<ProductSaleRow[]>(
      `products?select=id,name,cost_price,sale_price&id=in.(${productIds.join(",")})`
    ),
    supabaseRequest<VariantRow[]>(
      `product_variants?select=id,product_id,name,stock,extra_price&id=in.(${variantIds.join(",")})`
    ),
  ]);

  const productById = new Map(products.map((product) => [Number(product.id), product]));
  const variantById = new Map(variants.map((variant) => [Number(variant.id), variant]));

  const resolvedItems = aggregatedItems.map((item) => {
    const product = productById.get(item.productId);
    const variant = variantById.get(item.variationId);

    if (!product || !variant || Number(variant.product_id) !== item.productId) {
      throw new Error("Produto ou variacao nao encontrados.");
    }

    const currentStock = Number(variant.stock);

    if (item.quantity > currentStock) {
      throw new Error(`Quantidade maior do que o estoque disponivel para ${product.name} - ${variant.name}.`);
    }

    const unitPrice = Number(product.sale_price) + Number(variant.extra_price);
    const unitCost = Number(product.cost_price);

    return {
      product,
      variant,
      quantity: item.quantity,
      currentStock,
      unitPrice,
      unitCost,
      lineTotal: unitPrice * item.quantity,
      lineCost: unitCost * item.quantity,
    };
  });

  const grossAmount = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount =
    input.discountType === "percent"
      ? grossAmount * (input.discountValue / 100)
      : input.discountValue;

  if (input.discountType === "percent" && input.discountValue > 100) {
    throw new Error("O desconto percentual nao pode ser maior que 100%.");
  }

  if (discountAmount > grossAmount) {
    throw new Error("O desconto nao pode ser maior do que o subtotal da venda.");
  }

  let customerId = input.customerId;
  let customerName = input.customerName.trim();
  let customerPhone = input.customerPhone.trim();

  if (customerId) {
    const customers = await supabaseRequest<CustomerRow[]>(
      `customers?select=id,name,phone,notes,birth_day,birth_month,source&id=eq.${customerId}&limit=1`
    );
    const existingCustomer = customers[0];

    if (!existingCustomer) {
      throw new Error("Cliente selecionado nao encontrado.");
    }

    customerName = (existingCustomer.name ?? "").trim();
    customerPhone = (existingCustomer.phone ?? "").trim();
  } else if (customerName) {
    const createdCustomers = await supabaseRequest<Array<{ id: number; name: string | null; phone: string | null }>>(
      "customers",
      {
        method: "POST",
        body: JSON.stringify([
          {
            name: customerName,
            phone: customerPhone || null,
            notes: input.customerNotes.trim() || null,
            birth_day: input.customerBirthDay,
            birth_month: input.customerBirthMonth,
            source: normalizeCustomerSource(input.customerSource),
          },
        ]),
        prefer: "return=representation",
      }
    );

    const createdCustomer = createdCustomers[0];

    if (!createdCustomer?.id) {
      throw new Error("Nao foi possivel criar o cliente.");
    }

    customerId = Number(createdCustomer.id);
    customerName = (createdCustomer.name ?? customerName).trim();
    customerPhone = (createdCustomer.phone ?? customerPhone).trim();
  }

  const combinedSaleNotes = [input.saleNotes.trim(), input.customerNotes.trim()]
    .filter(Boolean)
    .join("\n\n");
  const totalAmount = Math.max(grossAmount - discountAmount, 0);
  const installmentAmount =
    input.installmentCount > 1
      ? input.installmentAmount > 0
        ? input.installmentAmount
        : totalAmount / input.installmentCount
      : totalAmount;
  const firstPaymentDate = input.firstPaymentDate.trim();
  const totalCost = resolvedItems.reduce((sum, item) => sum + item.lineCost, 0);
  const totalProfit = totalAmount - totalCost - input.paymentFeeValue;

  const createdSales = await supabaseRequest<Array<{ id: number }>>("sales", {
    method: "POST",
    body: JSON.stringify([
      {
        customer_id: customerId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        payment_method: input.paymentMethod,
        discount_type: input.discountType,
        discount_value: input.discountValue,
        payment_fee_value: input.paymentFeeValue,
        installment_count: input.installmentCount,
        installment_amount: installmentAmount,
        first_payment_date: firstPaymentDate || null,
        sale_notes: combinedSaleNotes || null,
        total_amount: totalAmount,
        total_profit: totalProfit,
      },
    ]),
    prefer: "return=representation",
  });

  const saleId = createdSales[0]?.id;

  if (!saleId) {
    throw new Error("Nao foi possivel criar a venda.");
  }

  await Promise.all([
    supabaseRequest("sale_items", {
      method: "POST",
      body: JSON.stringify(
        resolvedItems.map((item) => ({
          sale_id: saleId,
          product_id: Number(item.product.id),
          variant_id: Number(item.variant.id),
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price_snapshot: item.unitCost,
        }))
      ),
      prefer: "return=minimal",
    }),
    ...resolvedItems.map((item) =>
      supabaseRequest(`product_variants?id=eq.${item.variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          stock: item.currentStock - item.quantity,
        }),
        prefer: "return=minimal",
      })
    ),
  ]);

  return {
    quantity: resolvedItems.reduce((sum, item) => sum + item.quantity, 0),
    itemCount: resolvedItems.length,
    productName: resolvedItems[0]?.product.name ?? "Venda",
    variationName:
      resolvedItems.length === 1 ? resolvedItems[0]?.variant.name ?? "" : `${resolvedItems.length} itens`,
    grossAmount,
    discountAmount,
    installmentCount: input.installmentCount,
    installmentAmount,
    totalAmount,
    totalProfit,
  };
}
