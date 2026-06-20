import { expect, test } from "@playwright/test";
import { openAddForm, signUpFresh } from "./helpers";

test.describe("flujo de dinero", () => {
  test("crear cuenta, crear deuda, pagarla y verla en el historial", async ({
    page,
  }) => {
    await signUpFresh(page);

    // 1. Crear una cuenta con saldo de Bs 1.000,00
    const accounts = await openAddForm(page, "Cuentas bancarias");
    await page.getByLabel("Nombre / tipo de cuenta").fill("Ahorros");
    await page.getByLabel("Saldo actual").fill("1000");
    await accounts.getByRole("button", { name: "Guardar" }).click();
    await expect(accounts.getByText("Ahorros")).toBeVisible();
    await expect(accounts.getByText("Bs 1.000,00")).toBeVisible();

    // 2. Crear una deuda de Bs 450,00
    const payables = await openAddForm(page, "Por pagar");
    await page.getByLabel("¿A quién le debes?").fill("Carlos Gómez");
    await page.getByLabel("Razón o descripción").fill("Alquiler de junio");
    await payables.getByLabel("Monto").fill("450");
    await payables.getByRole("button", { name: "Guardar" }).click();
    await expect(payables.getByText("Carlos Gómez")).toBeVisible();

    // 3. Pagar la deuda completa desde la cuenta Ahorros
    await page.getByRole("button", { name: "Pagar: Carlos Gómez" }).click();
    await page
      .getByLabel("¿Con qué cuenta pagas? (opcional)")
      .selectOption({ index: 1 });
    await page.getByRole("button", { name: "Confirmar pago" }).click();

    // 4. La deuda desaparece y el saldo baja a Bs 550,00
    await expect(
      payables.getByText("No debes nada. Disfrútalo."),
    ).toBeVisible();
    await expect(accounts.getByText("Bs 550,00")).toBeVisible();

    // 5. El pago aparece en el historial
    const history = page.getByRole("region", { name: "Historial de pagos" });
    await expect(history.getByText("Carlos Gómez")).toBeVisible();
    await expect(history.getByText("Alquiler de junio")).toBeVisible();
  });

  test("rechaza pagar con saldo insuficiente", async ({ page }) => {
    await signUpFresh(page);

    const accounts = await openAddForm(page, "Cuentas bancarias");
    await page.getByLabel("Nombre / tipo de cuenta").fill("Caja chica");
    await page.getByLabel("Saldo actual").fill("100");
    await accounts.getByRole("button", { name: "Guardar" }).click();
    await expect(accounts.getByText("Bs 100,00")).toBeVisible();

    const payables = await openAddForm(page, "Por pagar");
    await page.getByLabel("¿A quién le debes?").fill("Proveedor");
    await page.getByLabel("Razón o descripción").fill("Insumos");
    await payables.getByLabel("Monto").fill("500");
    await payables.getByRole("button", { name: "Guardar" }).click();

    await page.getByRole("button", { name: "Pagar: Proveedor" }).click();
    await page
      .getByLabel("¿Con qué cuenta pagas? (opcional)")
      .selectOption({ index: 1 });
    await page.getByRole("button", { name: "Confirmar pago" }).click();

    // La mutación rechaza por saldo insuficiente: la deuda sigue ahí.
    await expect(
      page.getByText("No se pudo registrar el pago. Intenta de nuevo."),
    ).toBeVisible();
    await expect(accounts.getByText("Bs 100,00")).toBeVisible();
  });
});
