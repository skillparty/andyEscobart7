import { describe, expect, test } from "vitest";
import {
  buildImportRows,
  type ColumnMapping,
  chunk,
  guessColumnMapping,
} from "./excel";

describe("guessColumnMapping", () => {
  test("detecta encabezados en español", () => {
    const mapping = guessColumnMapping([
      "Código",
      "Descripción",
      "Cantidad",
      "Precio",
      "Modelos compatibles",
    ]);
    expect(mapping).toEqual({
      sku: "Código",
      name: "Descripción",
      stock: "Cantidad",
      priceCents: "Precio",
      modelsRaw: "Modelos compatibles",
    });
  });

  test("no asigna dos veces el mismo encabezado", () => {
    const mapping = guessColumnMapping(["Código"]);
    expect(mapping.sku).toBe("Código");
    expect(mapping.name).toBeNull();
  });

  test("deja sin mapear los campos que no encuentra", () => {
    const mapping = guessColumnMapping(["Columna Rara"]);
    expect(mapping).toEqual({
      sku: null,
      name: null,
      stock: null,
      priceCents: null,
      modelsRaw: null,
    });
  });

  test("ignora acentos y mayúsculas", () => {
    const mapping = guessColumnMapping(["CÓDIGO", "NOMBRE"]);
    expect(mapping.sku).toBe("CÓDIGO");
    expect(mapping.name).toBe("NOMBRE");
  });
});

describe("buildImportRows", () => {
  const mapping: ColumnMapping = {
    sku: "Código",
    name: "Nombre",
    stock: "Stock",
    priceCents: "Precio",
    modelsRaw: "Modelos",
  };

  test("convierte filas crudas al formato canónico", () => {
    const rows = buildImportRows(
      [
        {
          Código: "FA-100",
          Nombre: "Filtro de aceite",
          Stock: 10,
          Precio: "45.50",
          Modelos: "Hilux, Fortuner",
        },
      ],
      mapping,
    );
    expect(rows).toEqual([
      {
        sku: "FA-100",
        name: "Filtro de aceite",
        stock: 10,
        priceCents: 4550,
        modelsRaw: "Hilux, Fortuner",
      },
    ]);
  });

  test("redondea stock decimal y acepta precio con coma", () => {
    const rows = buildImportRows(
      [{ Código: "X", Nombre: "Y", Stock: "3.7", Precio: "10,00" }],
      mapping,
    );
    expect(rows[0].stock).toBe(4);
    expect(rows[0].priceCents).toBe(1000);
  });

  test("deja stock/precio undefined si la celda no es parseable", () => {
    const rows = buildImportRows(
      [{ Código: "X", Nombre: "Y", Stock: "n/a", Precio: "" }],
      mapping,
    );
    expect(rows[0].stock).toBeUndefined();
    expect(rows[0].priceCents).toBeUndefined();
  });

  test("descarta filas completamente vacías", () => {
    const rows = buildImportRows(
      [
        { Código: "", Nombre: "" },
        { Código: "FA-100", Nombre: "Filtro" },
      ],
      mapping,
    );
    expect(rows).toHaveLength(1);
  });

  test("respeta columnas no mapeadas (null) como ausentes", () => {
    const rows = buildImportRows([{ Código: "FA-100", Nombre: "Filtro" }], {
      ...mapping,
      modelsRaw: null,
    });
    expect(rows[0].modelsRaw).toBeUndefined();
  });
});

describe("chunk", () => {
  test("divide un arreglo en lotes del tamaño dado", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("un arreglo vacío produce cero lotes", () => {
    expect(chunk([], 5)).toEqual([]);
  });

  test("un solo lote cuando el tamaño supera el arreglo", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});
