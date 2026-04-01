import { getCurrentUser } from "@/lib/auth";
import { getAdminStorePayload, saveProduct, setProductActive } from "@/lib/store-data";
import type { ProductInput } from "@/types/store";

type AdminStoreSuccessResponse = {
  success: true;
  message: string;
  productId?: number;
  products: Awaited<ReturnType<typeof getAdminStorePayload>>["products"];
  summary: Awaited<ReturnType<typeof getAdminStorePayload>>["summary"];
  salesHistory: Awaited<ReturnType<typeof getAdminStorePayload>>["salesHistory"];
};

type AdminStoreErrorResponse = {
  success: false;
  error: string;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ success: false, error: message } satisfies AdminStoreErrorResponse, { status });
}

function parseNumber(value: unknown, fieldLabel: string) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));

  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldLabel} deve ser um numero valido.`);
  }

  return parsed;
}

function normalizeProductBody(body: unknown): ProductInput {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisicao invalido.");
  }

  const record = body as Record<string, unknown>;
  const rawVariants = Array.isArray(record.variants)
    ? record.variants
    : Array.isArray(record.variations)
      ? record.variations
      : null;

  if (!rawVariants?.length) {
    throw new Error("Adicione pelo menos uma variante.");
  }

  const name = String(record.name ?? "").trim();
  const category = String(record.category ?? "").trim();
  const description = String(record.description ?? "").trim();
  const imageUrl = String(record.image_url ?? record.imageUrl ?? "").trim();
  const active = typeof record.active === "boolean" ? record.active : true;
  const idValue = record.id;
  const id =
    idValue === undefined || idValue === null || idValue === ""
      ? undefined
      : Number(idValue);

  if (!name) {
    throw new Error("Informe o nome do produto.");
  }

  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
    throw new Error("ID do produto invalido.");
  }

  const costPrice = parseNumber(record.cost_price ?? record.costPrice, "Preco de custo");
  const salePrice = parseNumber(record.sale_price ?? record.salePrice, "Preco de venda");

  if (costPrice < 0) {
    throw new Error("Preco de custo nao pode ser negativo.");
  }

  if (salePrice < 0) {
    throw new Error("Preco de venda nao pode ser negativo.");
  }

  const variations = rawVariants.map((variant, index) => {
    if (!variant || typeof variant !== "object") {
      throw new Error(`Variante ${index + 1} invalida.`);
    }

    const variantRecord = variant as Record<string, unknown>;
    const variantName = String(variantRecord.name ?? "").trim();
    const extraPrice = parseNumber(
      variantRecord.extra_price ?? variantRecord.extraPrice,
      `Extra da variante ${index + 1}`
    );
    const stock = parseNumber(variantRecord.stock, `Estoque da variante ${index + 1}`);

    if (!variantName) {
      throw new Error(`Informe o nome da variante ${index + 1}.`);
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Estoque da variante ${index + 1} deve ser um numero inteiro maior ou igual a zero.`);
    }

    return {
      name: variantName,
      extraPrice,
      stock,
    };
  });

  return {
    id,
    name,
    category,
    description,
    costPrice,
    salePrice,
    active,
    imageUrl,
    variations,
  };
}

async function ensureUser() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Nao autenticado.", 401);
  }

  return null;
}

export async function GET() {
  const authError = await ensureUser();

  if (authError) {
    return authError;
  }

  try {
    const payload = await getAdminStorePayload();
    return Response.json({
      success: true,
      message: "Admin carregado com sucesso.",
      ...payload,
    } satisfies AdminStoreSuccessResponse);
  } catch (error) {
    console.error("[/api/admin/store] GET erro:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Nao foi possivel carregar o admin.",
      500
    );
  }
}

export async function POST(request: Request) {
  const authError = await ensureUser();

  if (authError) {
    return authError;
  }

  try {
    let rawBody: unknown;

    try {
      rawBody = (await request.json()) as unknown;
    } catch {
      return errorResponse("Body invalido");
    }

    console.log("[/api/admin/store] POST body:", rawBody);

    const body = normalizeProductBody(rawBody);
    const productId = await saveProduct(body);
    const payload = await getAdminStorePayload();

    return Response.json({
      success: true,
      message: "Produto salvo com sucesso.",
      productId,
      ...payload,
    } satisfies AdminStoreSuccessResponse);
  } catch (error) {
    console.error("[/api/admin/store] POST erro:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Nao foi possivel salvar o produto.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const authError = await ensureUser();

  if (authError) {
    return authError;
  }

  try {
    let body: { productId?: number; active?: boolean };

    try {
      body = (await request.json()) as { productId?: number; active?: boolean };
    } catch {
      return errorResponse("Body invalido");
    }

    if (!body.productId || typeof body.active !== "boolean") {
      return errorResponse("Dados invalidos.");
    }

    await setProductActive(body.productId, body.active);
    const payload = await getAdminStorePayload();

    return Response.json({
      success: true,
      message: body.active ? "Produto reativado com sucesso." : "Produto desativado com sucesso.",
      productId: body.productId,
      ...payload,
    } satisfies AdminStoreSuccessResponse);
  } catch (error) {
    console.error("[/api/admin/store] PATCH erro:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Nao foi possivel atualizar o produto."
    );
  }
}
