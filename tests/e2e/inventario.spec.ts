import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { signUpFresh } from "./helpers";

function buildSampleWorkbookBuffer(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Código", "Nombre", "Stock", "Precio", "Modelos compatibles"],
    ["FA-100", "Filtro de aceite", 10, 45.5, "Toyota Hilux, Toyota Fortuner"],
    ["FA-200", "Filtro de aire", 5, 30, "Toyota Hilux"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Inventario");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

test.describe("inventario", () => {
  test("importa un Excel y luego encuentra el repuesto buscando por modelo", async ({
    page,
  }) => {
    await signUpFresh(page);

    await page.getByRole("link", { name: "Inventario" }).click();
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(
      page.getByRole("heading", { name: "Importar desde Excel" }),
    ).toBeVisible();

    await page.getByLabel("Seleccionar archivo Excel o CSV").setInputFiles({
      name: "inventario.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: buildSampleWorkbookBuffer(),
    });

    // El mapeo de columnas se detecta solo a partir de los encabezados.
    await expect(page.getByLabel("Código / N° de serie *")).toHaveValue(
      "Código",
    );
    await expect(page.getByLabel("Nombre del repuesto *")).toHaveValue(
      "Nombre",
    );
    await expect(page.getByLabel("Modelos compatibles")).toHaveValue(
      "Modelos compatibles",
    );

    await page.getByRole("button", { name: "Importar 2 filas" }).click();

    await expect(
      page.getByText("2 repuestos nuevos", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("2 modelos nuevos", { exact: false }),
    ).toBeVisible();

    const searchBox = page.getByLabel(
      "Buscar por modelo de auto o por repuesto",
    );

    // Buscar por modelo: el modelo aparece con sus repuestos vinculados.
    await searchBox.fill("Hilux");
    await expect(
      page.getByText("Repuestos: Filtro de aceite, Filtro de aire"),
    ).toBeVisible();

    // Buscar por repuesto: el repuesto aparece con sus modelos vinculados.
    await searchBox.fill("FA-100");
    await expect(
      page.getByText("Sirve para: Toyota Hilux, Toyota Fortuner"),
    ).toBeVisible();
  });
});
