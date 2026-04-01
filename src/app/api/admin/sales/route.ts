import { getCurrentUser } from "@/lib/auth";
import { getAdminStorePayload, registerSale } from "@/lib/store-data";
import type { SaleInput } from "@/types/store";

type AdminSalesSuccessResponse = {
  success: true;
  message: string;
  sale: Awaited<ReturnType<typeof registerSale>>;
  products: Awaited<ReturnType<typeof getAdminStorePayload>>["products"];
  summary: Awaited<ReturnType<typeof getAdminStorePayload>>["summary"];
  salesHistory: Awaited<ReturnType<typeof getAdminStorePayload>>["salesHistory"];
};

type AdminSalesErrorResponse = {
  success: false;
  error: string;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ success: false, error: message } satisfies AdminSalesErrorResponse, { status });
}

function normalizeSaleBody(body: unknown): SaleInput {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisicao invalido.");
  }

  const record = body as Record<string, unknown>;
  const productId = Number(record.productId);
  const variationId = Number(record.variationId);
  const quantity = Number(record.quantity);

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error("Selecione um produto valido.");
  }

  if (!Number.isInteger(variationId) || variationId <= 0) {
    throw new Error("Selecione uma variacao valida.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Informe uma quantidade valida.");
  }

  return { productId, variationId, quantity };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Nao autenticado.", 401);
  }

  try {
    let rawBody: unknown;

    try {
      rawBody = (await request.json()) as unknown;
    } catch {
      return errorResponse("Body invalido");
    }

    console.log("[/api/admin/sales] POST body:", rawBody);

    const body = normalizeSaleBody(rawBody);
    const sale = await registerSale(body);
    const payload = await getAdminStorePayload();

    return Response.json({
      success: true,
      message: "Venda registrada com sucesso.",
      sale,
      ...payload,
    } satisfies AdminSalesSuccessResponse);
  } catch (error) {
    console.error("[/api/admin/sales] erro:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Nao foi possivel registrar a venda.",
      400
    );
  }
}
