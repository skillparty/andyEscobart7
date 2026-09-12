export type Season = "Verano" | "Otoño" | "Invierno" | "Primavera";

/**
 * Determina la estación del año según el mes calendario para el Hemisferio Sur (Bolivia / Sudamérica).
 * - Verano: Diciembre, Enero, Febrero (Meses 11, 0, 1)
 * - Otoño: Marzo, Abril, Mayo (Meses 2, 3, 4)
 * - Invierno: Junio, Julio, Agosto (Meses 5, 6, 7)
 * - Primavera: Septiembre, Octubre, Noviembre (Meses 8, 9, 10)
 */
export function getSeasonForDate(dateOrTs: Date | number): Season {
  const date = typeof dateOrTs === "number" ? new Date(dateOrTs) : dateOrTs;
  const month = date.getMonth();
  if (month === 11 || month === 0 || month === 1) {
    return "Verano";
  }
  if (month >= 2 && month <= 4) {
    return "Otoño";
  }
  if (month >= 5 && month <= 7) {
    return "Invierno";
  }
  return "Primavera";
}

export interface DefaultProduct {
  name: string;
  category: string;
  unit: string;
}

export const PRELOADED_PRODUCTS: readonly DefaultProduct[] = [
  {
    name: "Aceite comestible (1 L)",
    category: "Alimentos y Despensa",
    unit: "L",
  },
  {
    name: "Arroz de grano (1 kg)",
    category: "Alimentos y Despensa",
    unit: "kg",
  },
  {
    name: "Azúcar blanca (1 kg)",
    category: "Alimentos y Despensa",
    unit: "kg",
  },
  { name: "Leche entera (1 L)", category: "Lácteos y Huevos", unit: "L" },
  {
    name: "Huevos frescos (Maple 30 unid)",
    category: "Lácteos y Huevos",
    unit: "maple",
  },
  { name: "Carne de res (1 kg)", category: "Carnes y Proteínas", unit: "kg" },
  {
    name: "Pollo eviscerado (1 kg)",
    category: "Carnes y Proteínas",
    unit: "kg",
  },
  { name: "Tomate perita (1 kg)", category: "Frutas y Verduras", unit: "kg" },
  { name: "Cebolla cabeza (1 kg)", category: "Frutas y Verduras", unit: "kg" },
  {
    name: "Papa holandesa (1 arroba)",
    category: "Frutas y Verduras",
    unit: "arroba",
  },
  {
    name: "Pan de batalla (10 unid)",
    category: "Alimentos y Despensa",
    unit: "paquete",
  },
  {
    name: "Gasolina Especial (1 L)",
    category: "Transporte y Servicios",
    unit: "L",
  },
];
