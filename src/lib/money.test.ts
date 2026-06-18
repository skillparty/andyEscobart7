import { describe, expect, test } from "vitest";
import { centsToInput, formatMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  test("convierte decimales a centavos enteros", () => {
    expect(parseAmount("1240.50")).toBe(124050);
    expect(parseAmount("0.01")).toBe(1);
    expect(parseAmount("100")).toBe(10000);
  });

  test("acepta coma como separador decimal", () => {
    expect(parseAmount("1240,50")).toBe(124050);
  });

  test("ignora espacios alrededor", () => {
    expect(parseAmount("  85.00  ")).toBe(8500);
  });

  test("redondea al centavo más cercano sin drift de float", () => {
    // 0.1 + 0.2 en float = 0.30000000000000004; aquí debe ser exacto
    const sum = (parseAmount("0.1") ?? 0) + (parseAmount("0.2") ?? 0);
    expect(sum).toBe(30);
    expect(parseAmount("19.999")).toBe(2000);
  });

  test("permite montos negativos (saldos en rojo)", () => {
    expect(parseAmount("-450")).toBe(-45000);
  });

  test("devuelve null para entrada vacía o no numérica", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  test("devuelve null para infinito o sobre el límite", () => {
    expect(parseAmount("Infinity")).toBeNull();
    expect(parseAmount("1e15")).toBeNull();
  });
});

describe("formatMoney", () => {
  test("formatea centavos como Bolivianos", () => {
    const out = formatMoney(124050);
    expect(out).toContain("Bs");
    expect(out).toContain("1.240,50");
  });

  test("formatea cero con dos decimales", () => {
    expect(formatMoney(0)).toContain("0,00");
  });
});

describe("centsToInput", () => {
  test("convierte centavos a cadena decimal editable", () => {
    expect(centsToInput(124050)).toBe("1240.50");
    expect(centsToInput(1)).toBe("0.01");
    expect(centsToInput(-45000)).toBe("-450.00");
  });

  test("es inverso de parseAmount", () => {
    expect(parseAmount(centsToInput(8500))).toBe(8500);
  });
});
