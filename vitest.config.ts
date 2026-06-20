import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    // Vitest cubre unidad/integración (*.test.ts). Los E2E (*.spec.ts en
    // tests/e2e) corren con Playwright, no aquí.
    include: ["**/*.test.{ts,tsx}"],
  },
});
