"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatCurrency } from "@/lib/format";

export function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="v2-panel"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header><div className="v2-panel-body">{children}</div></section>;
}
export function Metric({ label, value, note, change }: { label: string; value: string; note: string; change?: number | null }) {
  return <article className="v2-metric"><span>{label}</span><strong>{value}</strong><small>{change != null && <b className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change.toFixed(1)}% </b>}{note}</small></article>;
}
export function Empty({ title = "Nenhum registro encontrado", children }: { title?: string; children?: ReactNode }) {
  return <div className="v2-empty"><span aria-hidden="true">▤</span><h3>{title}</h3><p>{children ?? "Ajuste os filtros ou cadastre o primeiro registro."}</p></div>;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) { return <span className={`v2-badge ${tone}`}>{children}</span>; }
export function Drawer({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; const focused = document.activeElement as HTMLElement; d?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { d?.close(); document.body.style.overflow = overflow; focused?.focus(); }; }, []);
  return <dialog className={`v2-drawer ${wide ? "wide" : ""}`} ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><header><h2>{title}</h2><button className="v2-button" onClick={onClose} aria-label="Fechar painel">×</button></header><div className="v2-drawer-body">{children}</div></dialog>;
}
export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const current = Math.min(page, pages - 1);
  return <><div className="v2-table-wrap"><table><thead><tr>{columns.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{rows.slice(current * 12, (current + 1) * 12).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <Empty />}</div><footer className="v2-pagination"><span>{rows.length} registros · página {current + 1} de {pages}</span><button className="v2-button" disabled={!current} onClick={() => setPage(current - 1)}>Anterior</button><button className="v2-button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Próxima</button></footer></>;
}
export function Trend({ points }: { points: { label: string; value: number }[] }) {
  if (!points.some(p => p.value !== 0)) return <Empty title="Sem faturamento neste período" />;
  const max = Math.max(1, ...points.map(p => p.value));
  const x = (i: number) => 65 + i * 590 / Math.max(1, points.length - 1);
  const y = (value: number) => 210 - value / max * 175;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  return <><svg className="v2-chart" viewBox="0 0 690 255" role="img" aria-label="Faturamento diário; valores disponíveis na tabela abaixo"><path d={`${line} L${x(points.length - 1)},210 L65,210 Z`} fill="#f2b705" opacity=".12" />{[0, .5, 1].map(n => <g key={n}><line x1="65" x2="655" y1={y(n * max)} y2={y(n * max)} stroke="#e4eaf0" strokeDasharray="3 5" /><text x="58" y={y(n * max) + 4} textAnchor="end">{new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n * max)}</text></g>)}<path d={line} stroke="#d4a20a" strokeWidth="3" fill="none" />{points.map((p, i) => <circle key={p.label} cx={x(i)} cy={y(p.value)} r="3" fill="#17314a"><title>{p.label}: {formatCurrency(p.value)}</title></circle>)}{[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => <text key={i} x={x(i)} y="240" textAnchor="middle">{points[i].label.split("-").reverse().slice(0, 2).join("/")}</text>)}</svg><details><summary>Consultar valores diários</summary><Table columns={["Dia", "Faturamento"]} rows={points.map(p => [p.label, formatCurrency(p.value)])} /></details></>;
}
export function Bars({ items, currency = true }: { items: { label: string; value: number }[]; currency?: boolean }) {
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
  return items.length ? <div className="v2-bars">{items.map((i, n) => <div key={`${i.label}-${n}`}><div><span>{i.label}</span><strong>{currency ? formatCurrency(i.value) : i.value}</strong></div><div className="v2-bar-track"><div style={{ width: `${Math.abs(i.value) / max * 100}%`, background: i.value < 0 ? "#d95c67" : n % 2 ? "#e1ac20" : "#214d6d" }} /></div></div>)}</div> : <Empty />;
}
