import { getCurrentUser } from "@/lib/auth";
import { getAdminStorePayload, saveCustomer } from "@/lib/store-data";
import type { CustomerInput } from "@/types/store";

type AdminCustomersSuccessResponse = {
  success: true;
  message: string;
  customerId?: number;
  customers: Awaited<ReturnType<typeof getAdminStorePayload>>["customers"];
  products: Awaited<ReturnType<typeof getAdminStorePayload>>["products"];
  categories: Awaited<ReturnType<typeof getAdminStorePayload>>["categories"];
  subcategories: Awaited<ReturnType<typeof getAdminStorePayload>>["subcategories"];
  summary: Awaited<ReturnType<typeof getAdminStorePayload>>["summary"];
  dashboard: Awaited<ReturnType<typeof getAdminStorePayload>>["dashboard"];
  salesHistory: Awaited<ReturnType<typeof getAdminStorePayload>>["salesHistory"];
};

type AdminCustomersErrorResponse = {
  success: false;
  error: string;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ success: false, error: message } satisfies AdminCustomersErrorResponse, { status });
}

function normalizeCustomerBody(body: unknown): CustomerInput {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisicao invalido.");
  }

  const record = body as Record<string, unknown>;
  const idValue = record.id;
  const id =
    idValue === undefined || idValue === null || idValue === ""
      ? undefined
      : Number(idValue);

  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
    throw new Error("ID do cliente invalido.");
  }

  return {
    id,
    name: String(record.name ?? "").trim(),
    phone: String(record.phone ?? "").trim(),
    notes: String(record.notes ?? "").trim(),
    birthDay:
      record.birthDay === undefined || record.birthDay === null || record.birthDay === ""
        ? null
        : Number(record.birthDay),
    birthMonth:
      record.birthMonth === undefined || record.birthMonth === null || record.birthMonth === ""
        ? null
        : Number(record.birthMonth),
    source: String(record.source ?? "").trim().toLowerCase() as CustomerInput["source"],
  };
}

async function ensureUser() {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Nao autenticado.", 401);
  }

  return null;
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

    const body = normalizeCustomerBody(rawBody);
    const customerId = await saveCustomer(body);
    const payload = await getAdminStorePayload();

    return Response.json({
      success: true,
      message: "Cliente salvo com sucesso.",
      customerId,
      ...payload,
    } satisfies AdminCustomersSuccessResponse);
  } catch (error) {
    console.error("[/api/admin/customers] POST erro:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Nao foi possivel salvar o cliente.",
      400
    );
  }
}
