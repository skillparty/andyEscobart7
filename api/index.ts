// Función SSR para Vercel (runtime Node). El handler de TanStack Start que
// `vite build` emite en `dist/server/server.js` usa la API web (`Request` ->
// `Response`), pero Vercel invoca la función con objetos Node `(req, res)`.
// Este puente convierte la petición Node a `Request`, llama al handler y
// vuelca la `Response` web en `res`.
//
// Nota: `api/` está excluido del typecheck del proyecto (ver tsconfig); se
// usa `any` para no depender de los tipos de `@vercel/node`/`node`.
import handler from "../dist/server/server.js";

// biome-ignore lint/suspicious/noExplicitAny: tipos del runtime Node de Vercel
export default async function ssr(req: any, res: any): Promise<void> {
  try {
    const proto =
      (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const host = req.headers.host ?? "localhost";
    const url = `${proto}://${host}${req.url ?? "/"}`;

    const method = (req.method ?? "GET").toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";

    const request = new Request(url, {
      method,
      headers: req.headers,
      body: hasBody ? await readBody(req) : undefined,
      // Necesario en Node al enviar un body como stream/buffer.
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);

    const response = await handler.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (error) {
    // Si el SSR falla, devolver un HTML mínimo con el shell del cliente
    // para que la app pueda hidratarse como SPA (client-side only).
    console.error("[SSR Error]", error);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Cuentas Claras</title>
  <meta name="theme-color" content="#f4f1e9" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="icon" href="/favicon.ico" />
  <style>
    body { margin: 0; background: #f4f1e9; font-family: Inter, system-ui, sans-serif; }
    .loading { display: grid; min-height: 100dvh; place-items: center; }
    .loading p { text-align: center; color: #555; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading"><p>Cargando…</p></div>
  </div>
  <script type="module" src="/assets/index-DEfWly6j.js"></script>
</body>
</html>`);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: IncomingMessage del runtime Node
function readBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
