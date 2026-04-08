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

export type AdminCustomer = {
  id: number;
  name: string;
  phone: string;
  notes: string;
  birth_day: number | null;
  birth_month: number | null;
  source: CustomerSource;
};

export type CustomerSource =
  | "familiar"
  | "amigo"
  | "indicacao"
  | "instagram"
  | "whatsapp"
  | "feira"
  | "cliente_recorrente"
  | "outro";

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

export type AdminSaleHistoryDetailItem = {
  product_id: number;
  product_name: string;
  variation_name: string | null;
  quantity: number;
  unit_price: number;
  cost_price_snapshot: number;
  subtotal: number;
};

export type AdminSaleHistoryItem = {
  id: number;
  created_at: string;
  subtotal_amount: number;
  discount_amount: number;
  payment_fee_value: number;
  installment_count: number;
  installment_amount: number;
  first_payment_date: string | null;
  total_amount: number;
  total_profit: number;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  sale_notes: string | null;
  item_count: number;
  item_names: string[];
  items: AdminSaleHistoryDetailItem[];
};

export type AdminTopProductMetric = {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  profit: number;
};

export type AdminTopCustomerMetric = {
  customer_id: number | null;
  customer_name: string;
  total_spent: number;
  purchase_count: number;
  items_purchased: number;
};

export type AdminBirthdayCustomer = {
  id: number;
  name: string;
  phone: string;
};

export type AdminDashboardMetrics = {
  revenueToday: number;
  revenueOverall: number;
  profitToday: number;
  profitOverall: number;
  salesToday: number;
  salesOverall: number;
  ticketAverageToday: number;
  ticketAverageOverall: number;
  totalDiscounts: number;
  totalPaymentFees: number;
  topProductsByQuantity: AdminTopProductMetric[];
  topProductsByRevenue: AdminTopProductMetric[];
  topProductsByProfit: AdminTopProductMetric[];
  topCustomers: AdminTopCustomerMetric[];
  birthdaysToday: AdminBirthdayCustomer[];
};

export type CatalogPayload = {
  products: CatalogProduct[];
};

export type AdminStorePayload = {
  products: AdminProduct[];
  customers: AdminCustomer[];
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  summary: AdminSummary;
  dashboard: AdminDashboardMetrics;
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

export type CustomerInput = {
  id?: number;
  name: string;
  phone: string;
  notes: string;
  birthDay: number | null;
  birthMonth: number | null;
  source: CustomerSource;
};

export type SaleInput = {
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  customerBirthDay: number | null;
  customerBirthMonth: number | null;
  customerSource: CustomerSource;
  paymentMethod: "pix" | "dinheiro" | "debito" | "credito";
  discountType: "amount" | "percent";
  discountValue: number;
  paymentFeeValue: number;
  installmentCount: number;
  installmentAmount: number;
  firstPaymentDate: string;
  saleNotes: string;
  items: Array<{
    productId: number;
    variationId: number;
    quantity: number;
  }>;
};
