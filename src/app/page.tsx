import { PublicCatalog } from "@/components/public-catalog";
import { getCatalogPayload } from "@/lib/store-data";

export default async function HomePage() {
  const payload = await getCatalogPayload();

  return <PublicCatalog products={payload.products} />;
}
