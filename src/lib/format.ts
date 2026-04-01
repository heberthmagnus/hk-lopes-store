export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function getProductTotalStock(stocks: Array<{ stock: number }>) {
  return stocks.reduce((sum, item) => sum + Number(item.stock || 0), 0);
}

export function getPriceRange(
  variations: Array<{ display_price: number }>
): { min: number; max: number } | null {
  if (!variations.length) {
    return null;
  }

  const values = variations.map((variation) => Number(variation.display_price));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function buildFallbackImage(label: string) {
  const safeLabel = label.slice(0, 22);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a1e37" />
          <stop offset="100%" stop-color="#0f3c78" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="36" fill="url(#bg)" />
      <circle cx="160" cy="112" r="54" fill="rgba(250,210,20,0.18)" />
      <rect x="58" y="198" width="204" height="34" rx="17" fill="rgba(255,255,255,0.12)" />
      <text x="160" y="274" text-anchor="middle" fill="#e1e1e1" font-size="24" font-family="Arial, sans-serif">${safeLabel}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
