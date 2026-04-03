export type Variation = {
  id: number;
  product_id: number;
  name: string;
  stock: number;
  extra_price: number;
  display_price: number;
};

export type AdminProduct = {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  category_slug: string | null;
  storefront_group: string | null;
  subcategory_id: number | null;
  subcategory_name: string | null;
  description: string;
  cost_price: number;
  sale_price: number;
  image_url: string;
  active: boolean;
  variations: Variation[];
};

export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
  storefront_group: string | null;
};

export type SubcategoryOption = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

export type CatalogProduct = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  category_name: string;
  category_slug: string | null;
  storefront_group: string | null;
  subcategory_name: string | null;
  min_sale_price: number;
  max_sale_price: number;
  is_featured: boolean;
};

export type AdminSummary = {
  productCount: number;
  variationCount: number;
  totalStock: number;
  totalRevenue: number;
  totalProfit: number;
  salesCount: number;
};

export type AdminSaleHistoryItem = {
  id: number;
  created_at: string;
  total_amount: number;
  total_profit: number;
  item_count: number;
  item_names: string[];
};

export type CatalogPayload = {
  products: CatalogProduct[];
};

export type AdminStorePayload = {
  products: AdminProduct[];
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  summary: AdminSummary;
  salesHistory: AdminSaleHistoryItem[];
};

export type ProductInput = {
  id?: number;
  name: string;
  categoryId: number;
  subcategoryId: number | null;
  description: string;
  costPrice: number;
  salePrice: number;
  active: boolean;
  imageUrl: string;
  variations: Array<{
    id?: number;
    name: string;
    extraPrice: number;
    stock: number;
  }>;
};

export type SaleInput = {
  productId: number;
  variationId: number;
  quantity: number;
};
