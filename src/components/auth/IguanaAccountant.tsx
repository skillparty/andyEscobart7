/**
 * Mascota de la app: un camaleón contador frente a una computadora "haciendo
 * cálculos". Line-art monocromo (usa currentColor) para combinar con la
 * dirección editorial tinta del login. Las partes animadas se controlan por
 * CSS en app.css y respetan prefers-reduced-motion.
 */
export function IguanaAccountant() {
  return (
    <svg
      viewBox="0 0 240 170"
      role="img"
      aria-label="Un camaleón contable haciendo cálculos frente a una computadora"
      className="iguana w-full max-w-[16rem] text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Símbolos de dinero flotando sobre el monitor */}
      <g className="text-positive" stroke="currentColor">
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

      {/* Monitor con pie */}
      <rect x="148" y="56" width="76" height="56" rx="6" />
      <path d="M186 112v14" />
      <path d="M170 130c4-3 28-3 32 0" />
      {/* Pantalla: barras verdes sobre línea base */}
      <g className="text-positive" stroke="currentColor" strokeWidth="2.2">
        <path d="M160 102v-10M172 102v-20M184 102v-8M196 102v-26M208 102v-16" />
      </g>
      <path d="M156 106h60" opacity="0.35" strokeWidth="1.6" />

      {/* Cola en espiral (firma del camaleón) */}
      <path
        d="M58 122
           C 46 132, 26 130, 24 118
           C 22 108, 32 100, 40 106
           C 46 110, 44 120, 36 118"
      />
      {/* Silueta continua: lomo → casco → hocico → mandíbula → vientre */}
      <path
        d="M58 122
           C 54 96, 70 76, 94 72
           C 100 64, 110 62, 114 68
           C 124 66, 134 76, 132 86
           C 131 92, 126 96, 120 98
           C 112 102, 104 102, 98 100
           C 96 112, 88 120, 78 122
           C 72 124, 64 124, 58 122 Z"
      />
      {/* Boca sonriente larga */}
      <path d="M131 89 C 123 95, 113 97, 105 96" strokeWidth="2" />
      {/* Ojo torreta: anillo + pupila que mira la pantalla */}
      <circle cx="114" cy="83" r="6.2" />
      <circle
        className="iguana-eye"
        cx="116.5"
        cy="82"
        r="1.9"
        fill="currentColor"
        stroke="none"
      />
      {/* Cresta dorsal: ondas apoyadas en el lomo */}
      <path
        d="M60 104 Q56 94 66 91 Q66 80 76 81 Q78 70 88 74 Q89 66 96 71"
        strokeWidth="2"
      />
      {/* Brazo que teclea + pinza (parte animada) */}
      <g className="iguana-arm">
        <path d="M96 106 C 103 112, 107 120, 109 128" />
        <path d="M105 130 c3 3 7 3 10 0" strokeWidth="2" />
      </g>
      {/* Pata trasera + pinza apoyada en el escritorio */}
      <path d="M70 122 C 68 128, 68 132, 69 136" />
      <path d="M64 138 c3-4 8-4 10 0" strokeWidth="2" />

      {/* Teclado frente al camaleón */}
      <path d="M117 136h46l-6-12h-31z" />
      <path d="M125 130h30" opacity="0.6" />
    </svg>
  );
}
