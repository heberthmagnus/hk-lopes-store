import type { AdminSaleHistoryItem } from "@/types/store";

export function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function metrics(sales: AdminSaleHistoryItem[]) {
  const revenue = sales.reduce((n, s) => n + s.total_amount, 0);
  const cost = sales.reduce((n, s) => n + s.items.reduce((sum, i) => sum + i.quantity * i.cost_price_snapshot, 0), 0);
  const fees = sales.reduce((n, s) => n + s.payment_fee_value, 0);
  const discounts = sales.reduce((n, s) => n + s.discount_amount, 0);
  return { revenue, cost, fees, discounts, gross: revenue - cost, contribution: revenue - cost - fees, count: sales.length, ticket: sales.length ? revenue / sales.length : null, margin: revenue ? (revenue - cost) / revenue * 100 : null };
}
export function salesInRange(sales: AdminSaleHistoryItem[], start: string, end: string) {
  return sales.filter(s => { const day = dayKey(s.created_at); return day >= start && day <= end; });
}
export function dailySeries(sales: AdminSaleHistoryItem[], start: string, end: string) {
  const days = new Map<string, number>();
  for (const sale of sales) { const day = dayKey(sale.created_at); days.set(day, (days.get(day) ?? 0) + sale.total_amount); }
  const result: { label: string; value: number }[] = [];
  for (let day = start; day <= end && result.length < 366; day = shiftDay(day, 1)) result.push({ label: day, value: days.get(day) ?? 0 });
  return result;
}
export function comparison(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}

export function productionCost(p: { grams: number; kgPrice: number; hours: number; kw: number; energy: number; machine: number; extras: number; loss: number; price: number; fee: number }) {
  const material = p.grams / 1000 * p.kgPrice * (1 + p.loss / 100);
  const energy = p.hours * p.kw * p.energy;
  const machine = p.hours * p.machine;
  const cost = material + energy + machine + p.extras;
  const fee = p.price * p.fee / 100;
  return { material, energy, machine, cost, fee, profit: p.price - cost - fee, margin: p.price > 0 ? (p.price - cost - fee) / p.price * 100 : null, markup: cost > 0 ? (p.price - cost) / cost * 100 : null };
}
