/**
 * Marca compacta de la app: la iguana contable reducida a un glifo, dentro de
 * un disco de tinta. Reutiliza la identidad del login en el topbar.
 */
export function BrandMark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-paper">
      <svg
        viewBox="0 0 32 32"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Lomo desde la cola hasta la cabeza */}
        <path d="M7 22c1-8 8-13 16-12" />
        {/* Cresta */}
        <path d="M12 12l1.6-2.4 1.8 2.2 1.8-2.2 1.8 2.2" />
        {/* Cabeza y hocico */}
        <path d="M23 10c3 0 5 1.8 5 4 0 2-1.8 3.2-4 3.2" />
        {/* Ojo */}
        <circle cx="24.5" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
        {/* Papada */}
        <path d="M24 17.2c-1.2 1.4-3 1.6-4.4 1" />
        {/* Vientre */}
        <path d="M21 16c-5 2.2-10 1.4-14-1" />
        {/* Cola que se enrosca */}
        <path d="M7 22c-2 .8-3 2.6-2 4.4" />
      </svg>
    </span>
  );
}
