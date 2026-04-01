import type { ProductInput } from "@/types/store";

export function parseVariationLines(raw: string): ProductInput["variations"] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("Adicione ao menos uma variação.");
  }

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length !== 3) {
      throw new Error(`Linha ${index + 1}: use Nome | Extra | Estoque.`);
    }

    const [name, extraPriceRaw, stockRaw] = parts;
    const extraPrice = Number(extraPriceRaw.replace(",", "."));
    const stock = Number(stockRaw);

    if (!name) {
      throw new Error(`Linha ${index + 1}: informe o nome da variação.`);
    }

    if (Number.isNaN(extraPrice)) {
      throw new Error(`Linha ${index + 1}: extra inválido.`);
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Linha ${index + 1}: estoque inválido.`);
    }

    return {
      name,
      extraPrice,
      stock,
    };
  });
}
