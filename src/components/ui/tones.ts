export type Tone = "positive" | "claim" | "debt";

interface ToneClasses {
  text: string;
  softBg: string;
  dot: string;
}

// Mapas estáticos: Tailwind necesita las clases completas en el código.
export const TONE_CLASSES: Record<Tone, ToneClasses> = {
  positive: {
    text: "text-positive",
    softBg: "bg-positive-soft",
    dot: "bg-positive",
  },
  claim: {
    text: "text-claim",
    softBg: "bg-claim-soft",
    dot: "bg-claim",
  },
  debt: {
    text: "text-debt",
    softBg: "bg-debt-soft",
    dot: "bg-debt",
  },
};

export const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm transition-colors duration-150 placeholder:text-ink-soft/60 focus:border-ink/40 focus:outline-none";

export const LABEL_CLASS =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft";
