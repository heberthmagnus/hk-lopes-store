"use client";

import { PublicCatalog } from "@/components/public-catalog";
import type { CatalogProduct } from "@/types/store";

export function StoreApp({ products = [] }: { products?: CatalogProduct[] }) {
  return <PublicCatalog products={products} />;
}
