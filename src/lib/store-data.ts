import type {
  AdminProduct,
  AdminSaleHistoryItem,
  AdminStorePayload,
  CatalogPayload,
  CategoryOption,
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
  total_amount: number;
  total_profit: number;
};

type SaleItemHistoryRow = {
  sale_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
};

type CategoryRow = CategoryOption;
type SubcategoryRow = SubcategoryOption;

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
  const [products, sales, categories, subcategories] = await Promise.all([
    getProductsWithVariants(),
    supabaseRequest<SaleRow[]>("sales?select=id,created_at,total_amount,total_profit&order=created_at.desc"),
    supabaseRequest<CategoryRow[]>("categories?select=id,name,slug,storefront_group&order=name.asc"),
    supabaseRequest<SubcategoryRow[]>("subcategories?select=id,category_id,name,slug&order=name.asc"),
  ]);

  const salesHistory = await getSalesHistory(sales);

  return {
    products,
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
    salesHistory,
  };
}

async function getSalesHistory(sales: SaleRow[]): Promise<AdminSaleHistoryItem[]> {
  if (!sales.length) {
    return [];
  }

  const recentSales = sales.slice(0, 12);
  const saleIds = recentSales.map((sale) => Number(sale.id));
  const saleFilter = saleIds.join(",");

  const saleItems = await supabaseRequest<SaleItemHistoryRow[]>(
    `sale_items?select=sale_id,product_id,variant_id,quantity&sale_id=in.(${saleFilter})`
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

  return recentSales.map((sale) => {
    const items = saleItemsBySaleId.get(Number(sale.id)) ?? [];
    const itemNames = items.map((item) => {
      const productName = productNameById.get(Number(item.product_id)) ?? "Produto";
      const variantName =
        item.variant_id !== null ? variantNameById.get(Number(item.variant_id)) : undefined;

      return variantName ? `${productName} - ${variantName}` : productName;
    });

    return {
      id: Number(sale.id),
      created_at: sale.created_at,
      total_amount: Number(sale.total_amount),
      total_profit: Number(sale.total_profit),
      item_count: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      item_names: itemNames,
    };
  });
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

export async function registerSale(input: SaleInput) {
  if (!input.productId || !input.variationId) {
    throw new Error("Selecione um produto e uma variacao.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Informe uma quantidade valida.");
  }

  const [products, variants] = await Promise.all([
    supabaseRequest<ProductSaleRow[]>(
      `products?select=id,name,cost_price,sale_price&id=eq.${input.productId}&limit=1`
    ),
    supabaseRequest<VariantRow[]>(
      `product_variants?select=id,product_id,name,stock,extra_price&id=eq.${input.variationId}&limit=1`
    ),
  ]);

  const product = products[0];
  const variant = variants[0];

  if (!product || !variant || Number(variant.product_id) !== input.productId) {
    throw new Error("Produto ou variacao nao encontrados.");
  }

  const currentStock = Number(variant.stock);

  if (input.quantity > currentStock) {
    throw new Error("Quantidade maior do que o estoque disponivel.");
  }

  const unitPrice = Number(product.sale_price) + Number(variant.extra_price);
  const unitCost = Number(product.cost_price);
  const totalAmount = unitPrice * input.quantity;
  const totalProfit = (unitPrice - unitCost) * input.quantity;

  const createdSales = await supabaseRequest<Array<{ id: number }>>("sales", {
    method: "POST",
    body: JSON.stringify([
      {
        customer_name: "",
        customer_phone: "",
        payment_method: "manual",
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
      body: JSON.stringify([
        {
          sale_id: saleId,
          product_id: Number(product.id),
          variant_id: Number(variant.id),
          quantity: input.quantity,
          unit_price: unitPrice,
          cost_price_snapshot: unitCost,
        },
      ]),
      prefer: "return=minimal",
    }),
    supabaseRequest(`product_variants?id=eq.${variant.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        stock: currentStock - input.quantity,
      }),
      prefer: "return=minimal",
    }),
  ]);

  return {
    quantity: input.quantity,
    productName: product.name,
    variationName: variant.name,
    totalAmount,
    totalProfit,
  };
}
