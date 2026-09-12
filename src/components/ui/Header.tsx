import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrandMark } from "~/components/ui/BrandMark";

interface HeaderProps {
  title?: string;
  rightSection?: React.ReactNode;
}

export function Header({
  title = "Cuentas Claras",
  rightSection,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isNegocioRoute = useMemo(() => {
    const path = location.pathname;
    return (
      path.startsWith("/inventario") ||
      path.startsWith("/compras") ||
      path.startsWith("/ventas") ||
      path.startsWith("/kardex")
    );
  }, [location.pathname]);

  const [activeScope, setActiveScope] = useState<"personal" | "negocio">(
    isNegocioRoute ? "negocio" : "personal",
  );

  // Mantener sincronizado el scope si la ruta cambia directamente
  const currentScope = isNegocioRoute ? "negocio" : activeScope;

  const handleScopeChange = (scope: "personal" | "negocio") => {
    setActiveScope(scope);
    if (scope === "negocio" && !isNegocioRoute) {
      void navigate({ to: "/inventario" });
    } else if (scope === "personal" && isNegocioRoute) {
      void navigate({ to: "/" });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        {/* Marca / Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 hover:opacity-90 shrink-0"
        >
          <BrandMark />
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </p>
        </Link>

        {/* Navegación Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {/* Selector de Ámbito: Personal vs Negocio */}
          <div className="flex items-center rounded-xl border border-line bg-paper/80 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleScopeChange("personal")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                currentScope === "personal"
                  ? "bg-card text-ink shadow-sm border border-line/60"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>👤</span> Personal
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange("negocio")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                currentScope === "negocio"
                  ? "bg-card text-ink shadow-sm border border-line/60"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>💼</span> Negocio
            </button>
          </div>

          {/* Sub-módulos según el ámbito activo */}
          <nav
            className="flex items-center gap-1.5"
            aria-label="Navegación de módulos"
          >
            {currentScope === "personal" ? (
              <>
                <NavLink to="/" label="Cuentas" />
                <NavLink to="/precios" label="Canasta & Precios" />
              </>
            ) : (
              <>
                <NavLink to="/inventario" label="Inventario" />
                <NavLink to="/compras" label="Compras" />
                <NavLink to="/ventas" label="Ventas" />
                <NavLink to="/kardex" label="Kardex" />
              </>
            )}
          </nav>

          {rightSection && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-line">
              {rightSection}
            </div>
          )}
        </div>

        {/* Botones Móvil (Menú Hamburguesa + Controles Rápidos) */}
        <div className="flex md:hidden items-center gap-2">
          {rightSection}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Alternar menú de navegación"
            className="grid size-9 place-items-center rounded-lg border border-line bg-paper text-ink transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-ink"
          >
            {isOpen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {isOpen && (
        <div className="md:hidden border-t border-line bg-card/95 backdrop-blur-lg px-6 py-4 animate-card-enter space-y-4">
          <div>
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-2">
              👤 Finanzas Personales
            </p>
            <nav className="flex flex-col gap-1.5">
              <MobileNavLink
                to="/"
                label="Cuentas & Saldos"
                onClick={() => setIsOpen(false)}
              />
              <MobileNavLink
                to="/precios"
                label="Canasta & Precios (Temporadas)"
                onClick={() => setIsOpen(false)}
              />
            </nav>
          </div>

          <div className="pt-2 border-t border-line">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-2">
              💼 Operaciones de Negocio
            </p>
            <nav className="flex flex-col gap-1.5">
              <MobileNavLink
                to="/inventario"
                label="Inventario de Repuestos"
                onClick={() => setIsOpen(false)}
              />
              <MobileNavLink
                to="/compras"
                label="Compras a Proveedores"
                onClick={() => setIsOpen(false)}
              />
              <MobileNavLink
                to="/ventas"
                label="Ventas & Margen"
                onClick={() => setIsOpen(false)}
              />
              <MobileNavLink
                to="/kardex"
                label="Kardex Valorado"
                onClick={() => setIsOpen(false)}
              />
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{
        className: "bg-line/40 border-ink/20 font-semibold shadow-xs",
      }}
      inactiveProps={{ className: "border-line hover:border-ink/30" }}
      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeProps={{ className: "bg-line/40 border-ink/20 font-semibold" }}
      inactiveProps={{ className: "border-line hover:bg-line/20" }}
      className="flex w-full items-center rounded-xl border px-4 py-2.5 text-sm font-medium text-ink transition-colors"
    >
      {label}
    </Link>
  );
}
