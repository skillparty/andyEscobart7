import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";

/**
 * Resuelve la URL de Convex con soporte para SSR en Vercel.
 *
 * `import.meta.env.VITE_CONVEX_URL` se sustituye en build-time por Vite.
 * En el servidor (Vercel), si la variable de build apunta a localhost (dev),
 * intentamos leerla desde `process.env` en runtime, donde Vercel la inyecta
 * desde sus Environment Variables.
 */
function getConvexUrl(): string {
  // Valor sustituido por Vite en build-time
  let url: string | undefined = import.meta.env.VITE_CONVEX_URL;

  // En SSR (servidor), si la URL es localhost o está vacía, intentamos
  // obtenerla de process.env (configurada en Vercel dashboard).
  if (typeof window === "undefined") {
    const runtimeUrl =
      typeof process !== "undefined"
        ? process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL
        : undefined;
    if (runtimeUrl) {
      url = runtimeUrl;
    }
  }

  if (!url) {
    throw new Error("Falta la variable de entorno VITE_CONVEX_URL");
  }
  return url;
}

export function getRouter() {
  const CONVEX_URL = getConvexUrl();
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: "intent",
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: () => (
        <div
          style={{
            display: "grid",
            minHeight: "100dvh",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "Inter, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Algo salió mal
            </p>
            <p style={{ marginTop: "0.5rem", color: "#777" }}>
              Intenta recargar la página.
            </p>
          </div>
        </div>
      ),
      defaultNotFoundComponent: () => (
        <div
          style={{
            display: "grid",
            minHeight: "100dvh",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "Inter, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Página no encontrada
          </p>
        </div>
      ),
      Wrap: ({ children }) => (
        <ConvexAuthProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexAuthProvider>
      ),
    }),
    queryClient,
  );

  return router;
}
