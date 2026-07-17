import { parseAmount } from "~/lib/money";
import type { ImportRow } from "../../../convex/inventario/importRows";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

export type CanonicalField =
  | "sku"
  | "name"
  | "stock"
  | "priceCents"
  | "modelsRaw";

/** Encabezado del Excel asignado a cada campo canónico (null = sin mapear). */
export type ColumnMapping = Record<CanonicalField, string | null>;

export const CANONICAL_FIELDS: {
  key: CanonicalField;
  label: string;
  required: boolean;
}[] = [
  { key: "sku", label: "Código / N° de serie", required: true },
  { key: "name", label: "Nombre del repuesto", required: true },
  { key: "stock", label: "Stock", required: false },
  { key: "priceCents", label: "Precio", required: false },
  { key: "modelsRaw", label: "Modelos compatibles", required: false },
];

/**
 * Lee la primera hoja de un archivo .xlsx/.xls/.csv en memoria.
 * Carga SheetJS (~115kb gz) de forma perezosa: solo pesa cuando el usuario
 * realmente sube un archivo, no al abrir la página de inventario.
 */
export async function parseWorkbook(data: ArrayBuffer): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error("El archivo no tiene hojas de cálculo");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const headers =
    rows.length > 0
      ? Object.keys(rows[0])
      : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? []).map(
          String,
        );
  return { headers, rows };
}

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const FIELD_PATTERNS: Record<CanonicalField, RegExp> = {
  sku: /codigo|cod\.?\b|sku|serie|parte|referencia|ref\.?\b/,
  name: /nombre|descripcion|producto|repuesto|articulo|item/,
  stock: /stock|cantidad|existencia|cant\.?\b/,
  priceCents: /precio|costo|valor/,
  modelsRaw: /modelo|compatible|vehiculo|auto\b/,
};

/**
 * Adivina qué encabezado del Excel corresponde a cada campo canónico,
 * por nombre de columna. El usuario puede corregir el resultado a mano.
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    sku: null,
    name: null,
    stock: null,
    priceCents: null,
    modelsRaw: null,
  };
  const claimed = new Set<string>();

  for (const field of CANONICAL_FIELDS) {
    const match = headers.find((header) => {
      if (claimed.has(header)) {
        return false;
      }
      return FIELD_PATTERNS[field.key].test(normalizeHeader(header));
    });
    if (match !== undefined) {
      mapping[field.key] = match;
      claimed.add(match);
    }
  }

  return mapping;
}

function getCell(row: Record<string, unknown>, header: string | null): unknown {
  if (header === null) {
    return undefined;
  }
  return row[header];
}

/** Intenta parsear stock como entero; si la celda no es un número usable devuelve undefined (el backend lo tratará como 0). */
function parseStockCell(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return undefined;
}

/** Intenta parsear el precio (en la unidad del usuario, ej. "45.50") a centavos usando la misma lógica que el resto de la app. */
function parsePriceCell(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const cents = parseAmount(String(value));
  return cents !== null && cents >= 0 ? cents : undefined;
}

/** Convierte las filas crudas del Excel (según el mapeo de columnas elegido) al formato que espera `importRows`. */
export function buildImportRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
): ImportRow[] {
  return rows
    .map((row) => ({
      sku: String(getCell(row, mapping.sku) ?? "").trim(),
      name: String(getCell(row, mapping.name) ?? "").trim(),
      stock: parseStockCell(getCell(row, mapping.stock)),
      priceCents: parsePriceCell(getCell(row, mapping.priceCents)),
      modelsRaw:
        mapping.modelsRaw !== null
          ? String(getCell(row, mapping.modelsRaw) ?? "")
          : undefined,
    }))
    .filter((row) => row.sku.length > 0 || row.name.length > 0);
}

/** Divide un arreglo en lotes de a lo más `size` elementos. */
export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
