/**
 * Mascota de la app: una iguana contadora frente a una computadora "haciendo
 * cálculos". Line-art monocromo (usa currentColor) para combinar con la
 * dirección editorial tinta del login. Las partes animadas se controlan por
 * CSS en app.css y respetan prefers-reduced-motion.
 */
export function IguanaAccountant() {
  return (
    <svg
      viewBox="0 0 240 170"
      role="img"
      aria-label="Una iguana contable haciendo cálculos frente a una computadora"
      className="iguana w-full max-w-[16rem] text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Símbolos de dinero flotando sobre el monitor */}
      <g className="iguana-symbols text-positive" stroke="currentColor">
        <text
          x="150"
          y="34"
          className="iguana-sym iguana-sym-1"
          fontSize="15"
          fontWeight="700"
          stroke="none"
          fill="currentColor"
        >
          Bs
        </text>
        <path className="iguana-sym iguana-sym-2" d="M183 26v12M177 32h12" />
        <path className="iguana-sym iguana-sym-3" d="M205 40h12" />
      </g>

      {/* Escritorio */}
      <path d="M14 138h212" />

      {/* Monitor */}
      <rect x="150" y="62" width="72" height="52" rx="5" />
      <path d="M186 114v14M172 130h28" />
      {/* Pantalla: mini gráfico de barras en verde positivo */}
      <g className="text-positive" stroke="currentColor" strokeWidth="2.2">
        <path d="M162 102v-12M174 102v-20M186 102v-9M198 102v-24M210 102v-15" />
      </g>

      {/* Iguana de perfil, mirando al monitor */}
      {/* Lomo con cresta (zig-zag) desde la cola hasta la cabeza */}
      <path d="M26 122c8-30 30-44 60-46l8-1" />
      <path
        className="iguana-crest"
        d="M40 104l5-9 6 8 6-9 6 8 6-8 6 7 6-8 6 7"
      />
      {/* Cabeza y hocico apuntando a la derecha hacia el teclado */}
      <path d="M94 75c14-1 26 3 30 12 3 7-1 14-9 17" />
      {/* Papada (dewlap) bajo la barbilla */}
      <path d="M115 104c-6 6-14 7-20 4" />
      {/* Ojo */}
      <circle cx="110" cy="84" r="2.2" fill="currentColor" stroke="none" />
      {/* Vientre / parte baja del cuerpo */}
      <path d="M95 108c-22 6-44 4-58-2" />
      {/* Pata trasera apoyada */}
      <path d="M48 110c-3 9-3 18 0 26" />
      {/* Brazo que teclea (parte animada) */}
      <path className="iguana-arm" d="M96 110c8 4 16 9 22 16" />
      {/* Cola larga que se enrosca a la izquierda */}
      <path d="M26 122c-12 4-18 12-14 22 3 7 12 8 16 2" />

      {/* Teclado frente a la iguana */}
      <path d="M120 134h44l-6-12h-32z" />
      <path d="M128 128h28" opacity="0.6" />
    </svg>
  );
}
