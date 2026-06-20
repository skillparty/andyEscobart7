import { TONE_CLASSES, type Tone } from "./tones";

interface MonogramProps {
  name: string;
  tone: Tone;
}

/** Iniciales (1-2) de un nombre, en mayúsculas. "Carlos Gómez" -> "CG". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase();
}

/** Disco con las iniciales de una persona, teñido por el tono de la sección. */
export function Monogram({ name, tone }: MonogramProps) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <span
      aria-hidden="true"
      className={`grid size-9 shrink-0 select-none place-items-center rounded-full text-xs font-semibold ${toneClasses.softBg} ${toneClasses.text}`}
    >
      {initialsOf(name)}
    </span>
  );
}
