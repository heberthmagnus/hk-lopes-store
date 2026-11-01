"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export type AdminSection = "dashboard" | "sales" | "customers" | "products" | "orders" | "categories" | "stock" | "movements" | "results" | "costs" | "reports" | "users" | "settings";

const groups: { label: string; icon: string; items: { label: string; section?: AdminSection }[] }[] = [
  { label: "Visão Geral", icon: "▦", items: [{ label: "Dashboard Executivo", section: "dashboard" }] },
  { label: "Comercial", icon: "◇", items: [{ label: "Vendas", section: "sales" }, { label: "Pedidos", section: "orders" }, { label: "Clientes", section: "customers" }] },
  { label: "Catálogo e Estoque", icon: "▣", items: [{ label: "Produtos", section: "products" }, { label: "Categorias", section: "categories" }, { label: "Estoque", section: "stock" }, { label: "Movimentações", section: "movements" }] },
  { label: "Financeiro", icon: "◈", items: [{ label: "Resultados", section: "results" }, { label: "Custos e Margens", section: "costs" }, { label: "Relatórios", section: "reports" }] },
  { label: "Administração", icon: "⚙", items: [{ label: "Usuários e Permissões", section: "users" }, { label: "Configurações", section: "settings" }] },
];

function NavigationItem({ item, active, onNavigate }: { item: { label: string; section?: AdminSection }; active: AdminSection; onNavigate: (section: AdminSection) => void }) {
  if (!item.section) return <span className="admin-nav-item admin-nav-item--disabled">{item.label}<small>Em breve</small></span>;
  const section = item.section;
  return <Link href={`/admin?secao=${section}`} className={`admin-nav-item ${active === section ? "is-active" : ""}`} aria-current={active === section ? "page" : undefined} onClick={() => onNavigate(section)}>{item.label}</Link>;
}

function NavigationGroup({ group, active, collapsed, onNavigate }: { group: typeof groups[number]; active: AdminSection; collapsed: boolean; onNavigate: (section: AdminSection) => void }) {
  const isActive = group.items.some((item) => item.section === active);
  const [open, setOpen] = useState(isActive);
  useEffect(() => { if (isActive && !collapsed) setOpen(true); }, [isActive, collapsed]);
  return <div className={`admin-nav-group ${isActive ? "is-active" : ""} ${open ? "is-open" : ""}`}>
    <button type="button" className="admin-nav-group__toggle" onClick={() => setOpen(!open)} aria-expanded={open} title={collapsed ? group.label : undefined}>
      <span className="admin-nav-group__icon" aria-hidden="true">{group.icon}</span><span className="admin-nav-group__label">{group.label}</span><span className="admin-nav-group__chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="admin-nav-submenu" aria-label={group.label}>{collapsed && <strong className="admin-nav-submenu__title">{group.label}</strong>}{group.items.map((item) => <NavigationItem key={item.label} item={item} active={active} onNavigate={(section) => { onNavigate(section); if (collapsed) setOpen(false); }} />)}</div>}
  </div>;
}

function AdminHeader({ onOpen, onLogout }: { onOpen: () => void; onLogout: () => void }) {
  return <header className="admin-layout__header"><button type="button" className="admin-layout__mobile-toggle" onClick={onOpen} aria-label="Abrir menu">☰</button><div className="admin-layout__identity"><Image src="/logo-hk-lopes-store.png" alt="" width={48} height={40} /><span><strong>HK Lopes Store</strong><small>Área administrativa</small></span></div><button type="button" className="admin-layout__logout" onClick={onLogout}>Sair</button></header>;
}

export function AdminLayout({ active, onNavigate, onLogout, children }: { active: AdminSection; onNavigate: (section: AdminSection) => void; onLogout: () => void; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className={`admin-layout ${collapsed ? "admin-layout--collapsed" : ""} ${mobileOpen ? "admin-layout--open" : ""}`}>
    {mobileOpen && <button type="button" className="admin-layout__backdrop" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
    <aside className="admin-sidebar" aria-label="Navegação administrativa">
      <div className="admin-sidebar__brand"><span className="admin-sidebar__mark"><Image src="/logo-hk-lopes-store.png" alt="HK Lopes Store" width={42} height={42} /></span><strong>HK LOPES <small>STORE</small></strong><button type="button" className="admin-sidebar__collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? "›" : "‹"}</button><button type="button" className="admin-sidebar__close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">×</button></div>
      <div className="admin-sidebar__store-wrap"><Link href="/" className="admin-sidebar__store" title="Visualizar Loja"><span aria-hidden="true">↗</span><span>Visualizar Loja</span></Link></div>
      <nav className="admin-sidebar__nav" aria-label="Menu administrativo">{groups.map((group) => <NavigationGroup key={group.label} group={group} active={active} collapsed={collapsed && !mobileOpen} onNavigate={(section) => { onNavigate(section); setMobileOpen(false); }} />)}</nav>
    </aside>
    <div className="admin-layout__main"><AdminHeader onOpen={() => setMobileOpen(true)} onLogout={onLogout} />{children}</div>
  </div>;
}
