import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "~/components/ui/BrandMark";

interface HeaderProps {
  title?: string;
  rightSection?: React.ReactNode;
}

export function Header({ title = "Cuentas Claras", rightSection }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        {/* Marca / Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90">
          <BrandMark />
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </p>
        </Link>

        {/* Navegación Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <nav className="flex items-center gap-2" aria-label="Navegación principal">
            <NavLink to="/" label="Cuentas" />
            <NavLink to="/inventario" label="Inventario" />
            <NavLink to="/compras" label="Compras" />
            <NavLink to="/kardex" label="Kardex" />
            <NavLink to="/ventas" label="Ventas" />
          </nav>
          {rightSection && <div className="flex items-center gap-2 ml-2 pl-2 border-l border-line">{rightSection}</div>}
        </div>

        {/* Botones Móvil (Menú Hamburguesa + Controles Rápidos) */}
        <div className="flex sm:hidden items-center gap-2">
          {rightSection}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Alternar menú de navegación"
            className="grid size-9 place-items-center rounded-lg border border-line bg-paper text-ink transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-ink"
          >
            {isOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {isOpen && (
        <div className="sm:hidden border-t border-line bg-card/95 backdrop-blur-lg px-6 py-4 animate-card-enter">
          <nav className="flex flex-col gap-2" aria-label="Navegación móvil">
            <MobileNavLink to="/" label="Cuentas" onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/inventario" label="Inventario" onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/compras" label="Compras" onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/kardex" label="Kardex" onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/ventas" label="Ventas" onClick={() => setIsOpen(false)} />
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-line/40 border-ink/20 font-semibold" }}
      inactiveProps={{ className: "border-line hover:border-ink/30" }}
      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeProps={{ className: "bg-line/40 border-ink/20 font-semibold" }}
      inactiveProps={{ className: "border-line hover:bg-line/20" }}
      className="flex w-full items-center rounded-xl border px-4 py-3 text-sm font-medium text-ink transition-colors"
    >
      {label}
    </Link>
  );
}
