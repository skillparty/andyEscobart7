import { describe, expect, test } from "vitest";
import { splitModelNames } from "./lib";

describe("splitModelNames", () => {
  test("separa por coma", () => {
    expect(splitModelNames("Hilux, Fortuner, Corolla")).toEqual([
      "Hilux",
      "Fortuner",
      "Corolla",
    ]);
  });

  test("separa por slash y salto de línea", () => {
    expect(splitModelNames("Hilux / Fortuner\nCorolla")).toEqual([
      "Hilux",
      "Fortuner",
      "Corolla",
    ]);
  });

  test("separa por ' y ' y '&'", () => {
    expect(splitModelNames("Hilux y Fortuner & Corolla")).toEqual([
      "Hilux",
      "Fortuner",
      "Corolla",
    ]);
  });

  test("recorta espacios y colapsa espacios internos", () => {
    expect(splitModelNames("  Toyota   Hilux  ,  Fortuner  ")).toEqual([
      "Toyota Hilux",
      "Fortuner",
    ]);
  });

  test("elimina duplicados sin distinguir mayúsculas", () => {
    expect(splitModelNames("Hilux, HILUX, hilux")).toEqual(["Hilux"]);
  });

  test("ignora celdas vacías o solo con separadores", () => {
    expect(splitModelNames("")).toEqual([]);
    expect(splitModelNames(" , , ")).toEqual([]);
  });
});
