import { expect, type Page } from "@playwright/test";

/**
 * Inicia sesión con un usuario nuevo y único vía el provider Password de prueba.
 * Cada test arranca con datos limpios porque el email es irrepetible.
 */
export async function signUpFresh(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  await page.goto("/");

  const form = page.getByTestId("e2e-login");
  await expect(form).toBeVisible();

  await page.getByLabel("E2E email").fill(email);
  await page.getByLabel("E2E password").fill("e2e-password-1234");
  await page.getByRole("button", { name: "Entrar (E2E)" }).click();

  // El dashboard renderiza el balance neto una vez autenticado.
  await expect(page.getByText("Balance neto", { exact: false })).toBeVisible();

  return email;
}

/** Abre el formulario "+ Agregar" dentro de una tarjeta por su título. */
export async function openAddForm(page: Page, regionName: string) {
  const region = page.getByRole("region", { name: regionName });
  await region.getByRole("button", { name: "+ Agregar" }).click();
  return region;
}
