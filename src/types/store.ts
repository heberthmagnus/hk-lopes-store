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
  category: string;
  description: string;
  cost_price: number;
  sale_price: number;
  image_url: string;
  active: boolean;
  variations: Variation[];
};

export type CatalogProduct = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  category: string;
  min_sale_price: number;
  max_sale_price: number;
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
  summary: AdminSummary;
  salesHistory: AdminSaleHistoryItem[];
};

export type ProductInput = {
  id?: number;
  name: string;
  category: string;
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
