import { PublicCatalog } from "@/components/public-catalog";
import { getCatalogPayload } from "@/lib/store-data";

export default async function TesteTemplatePage() {
  const payload = await getCatalogPayload();

  return <PublicCatalog products={payload.products} variant="template" />;
}
