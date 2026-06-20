import { expect, test } from "@playwright/test";
import { signUpFresh } from "./helpers";

test.describe("autenticación", () => {
  test("la pantalla de login se muestra al usuario no autenticado", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /amistades largas/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continuar con Google/i }),
    ).toBeVisible();
  });

  test("un usuario nuevo entra al dashboard vía el provider de prueba", async ({
    page,
  }) => {
    await signUpFresh(page);
    await expect(
      page.getByRole("region", { name: "Cuentas bancarias" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Por pagar" })).toBeVisible();
  });
});
