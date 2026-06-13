export interface Bank {
  slug: string;
  name: string;
}

export const BANKS: Bank[] = [
  { slug: "BCP", name: "Banco de Crédito BCP" },
  { slug: "BNB", name: "Banco Nacional de Bolivia" },
  { slug: "bancoBisa", name: "Banco BISA" },
  { slug: "bancoEconomico", name: "Banco Económico" },
  { slug: "bancoFortaleza", name: "Banco Fortaleza" },
  { slug: "bancoSol", name: "BancoSol" },
  { slug: "bancoUnion", name: "Banco Unión" },
  { slug: "MSC", name: "Mutual La Primera" },
];

export function getBankName(slug: string): string {
  return BANKS.find((b) => b.slug === slug)?.name ?? slug;
}

export function bankLogoUrl(slug: string): string {
  return `/${slug}.png`;
}
