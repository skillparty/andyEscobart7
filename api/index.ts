// Función SSR para Vercel. Delega al handler `fetch` de TanStack Start que
// `vite build` emite en `dist/server/server.js`. Los estáticos del cliente
// (`dist/client`) los sirve Vercel antes de llegar aquí (ver vercel.json).
import handler from "../dist/server/server.js";

export default function ssr(request: Request): Response | Promise<Response> {
  return handler.fetch(request);
}
