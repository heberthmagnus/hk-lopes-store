import { getCurrentUser } from "@/lib/auth";
import { getAdminStorePayload, registerSale } from "@/lib/store-data";
import type { SaleInput } from "@/types/store";

type AdminSalesSuccessResponse = {
  success: true;
  message: string;
  sale: Awaited<ReturnType<typeof registerSale>>;
  products: Awaited<ReturnType<typeof getAdminStorePayload>>["products"];
  customers: Awaited<ReturnType<typeof getAdminStorePayload>>["customers"];
  categories: Awaited<ReturnType<typeof getAdminStorePayload>>["categories"];
  subcategories: Awaited<ReturnType<typeof getAdminStorePayload>>["subcategories"];
  summary: Awaited<ReturnType<typeof getAdminStorePayload>>["summary"];
  dashboard: Awaited<ReturnType<typeof getAdminStorePayload>>["dashboard"];
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
  const customerIdValue = record.customerId;
  const customerId =
    customerIdValue === null || customerIdValue === undefined || customerIdValue === ""
      ? null
      : Number(customerIdValue);
  const customerName = typeof record.customerName === "string" ? record.customerName : "";
  const customerPhone = typeof record.customerPhone === "string" ? record.customerPhone : "";
  const customerNotes = typeof record.customerNotes === "string" ? record.customerNotes : "";
  const customerBirthDay =
    record.customerBirthDay === undefined || record.customerBirthDay === null || record.customerBirthDay === ""
      ? null
      : Number(record.customerBirthDay);
  const customerBirthMonth =
    record.customerBirthMonth === undefined || record.customerBirthMonth === null || record.customerBirthMonth === ""
      ? null
      : Number(record.customerBirthMonth);
  const customerSource = String(record.customerSource ?? "outro").trim().toLowerCase();
  const paymentMethod = String(record.paymentMethod ?? "").trim().toLowerCase();
  const discountType = String(record.discountType ?? "").trim().toLowerCase();
  const discountValue = Number(record.discountValue ?? 0);
  const paymentFeeValue = Number(record.paymentFeeValue ?? 0);
  const installmentCount = Number(record.installmentCount ?? 1);
  const installmentAmount = Number(record.installmentAmount ?? 0);
  const firstPaymentDate = typeof record.firstPaymentDate === "string" ? record.firstPaymentDate : "";
  const saleNotes = typeof record.saleNotes === "string" ? record.saleNotes : "";
  const rawItems = Array.isArray(record.items) ? record.items : [];

  const items = rawItems.map((item) => {
    const entry = item as Record<string, unknown>;
    const productId = Number(entry.productId);
    const variationId = Number(entry.variationId);
    const quantity = Number(entry.quantity);

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
  });

  if (!items.length) {
    throw new Error("Adicione ao menos um item na venda.");
  }

  if (customerId !== null && (!Number.isInteger(customerId) || customerId <= 0)) {
    throw new Error("Selecione um cliente valido.");
  }

  if (!["pix", "dinheiro", "debito", "credito"].includes(paymentMethod)) {
    throw new Error("Selecione uma forma de pagamento valida.");
  }

  if (!["amount", "percent"].includes(discountType)) {
    throw new Error("Selecione um tipo de desconto valido.");
  }

  if (Number.isNaN(discountValue) || discountValue < 0) {
    throw new Error("Informe um desconto valido.");
  }

  if (Number.isNaN(paymentFeeValue) || paymentFeeValue < 0) {
    throw new Error("Informe uma taxa de pagamento valida.");
  }

  return {
    customerId,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerNotes: customerNotes.trim(),
    customerBirthDay,
    customerBirthMonth,
    customerSource: customerSource as SaleInput["customerSource"],
    paymentMethod: paymentMethod as SaleInput["paymentMethod"],
    discountType: discountType as SaleInput["discountType"],
    discountValue,
    paymentFeeValue,
    installmentCount,
    installmentAmount,
    firstPaymentDate: firstPaymentDate.trim(),
    saleNotes: saleNotes.trim(),
    items,
  };
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
