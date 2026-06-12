// Servidor de producción (Railway): sirve los estáticos del cliente y
// delega el resto al handler SSR de TanStack Start.
import handler from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);
const clientDir = new URL("./dist/client", import.meta.url).pathname;

const server = Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/" && pathname.includes(".")) {
      const file = Bun.file(`${clientDir}${pathname}`);
      if (await file.exists()) {
        const headers = pathname.startsWith("/assets/")
          ? { "Cache-Control": "public, max-age=31536000, immutable" }
          : undefined;
        return new Response(file, { headers });
      }
    }
    return handler.fetch(request);
  },
});

console.log(`Cuentas Claras escuchando en http://localhost:${server.port}`);
