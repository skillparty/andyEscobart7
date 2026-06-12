# Cuentas Claras

Gestor de finanzas personales: tus cuentas bancarias, lo que te deben y lo que debes, en un solo lugar. Inicio de sesión con Google.

**Stack:** [TanStack Start](https://tanstack.com/start) · [Convex](https://convex.dev) (base de datos + backend en tiempo real) · [Convex Auth](https://labs.convex.dev/auth) (Google OAuth) · [Bun](https://bun.sh) · [Biome](https://biomejs.dev) · [Tailwind CSS 4](https://tailwindcss.com) · [Railway](https://railway.com)

## Funcionalidades

- **Cuentas bancarias** — nombre y saldo de cada cuenta, con edición rápida del saldo.
- **Por cobrar** — quién te debe, cuánto y una nota opcional. Botón ✓ para marcar como cobrado.
- **Por pagar** — a quién le debes, la razón y el monto. Botón ✓ para marcar como pagado.
- **Balance neto** — saldo en cuentas + por cobrar − por pagar, en tiempo real.
- Cada usuario solo ve sus propios datos (todas las consultas filtran por usuario autenticado).

## Desarrollo local

```bash
bun install
bun run dev   # levanta Convex + Vite juntos
```

La primera vez, `convex dev` te pedirá iniciar sesión en Convex y crear el proyecto; eso genera `.env.local` con `VITE_CONVEX_URL`.

### Configurar Google OAuth (una sola vez)

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea un **OAuth client ID** (tipo: aplicación web).
2. En **Authorized redirect URIs** agrega:
   `https://<tu-deployment>.convex.site/api/auth/callback/google`
   (la URL `.convex.site` aparece en el dashboard de Convex).
3. Configura las variables en el deployment de Convex:

```bash
bunx convex env set AUTH_GOOGLE_ID <client-id>
bunx convex env set AUTH_GOOGLE_SECRET <client-secret>
bunx convex env set SITE_URL http://localhost:3000
```

## Calidad

```bash
bun run lint      # Biome (lint + formato)
bun run lint:fix  # corrige automáticamente
bun run build     # vite build + tsc --noEmit
```

## Deploy en Railway

El repo incluye `railway.json` (Nixpacks: `bun install && bun run build`, arranque con `bun server.js`).

1. En Convex crea el deployment de producción: `bunx convex deploy` (te da la URL de producción).
2. En Railway crea el servicio desde este repo y define las variables:
   - `VITE_CONVEX_URL` = URL del deployment de producción de Convex (necesaria en build).
3. En el deployment de producción de Convex configura `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` y `SITE_URL` = URL pública de Railway.
4. Agrega la redirect URI de producción en Google Cloud:
   `https://<tu-deployment-prod>.convex.site/api/auth/callback/google`

## Estructura

```
convex/
├── schema.ts          # accounts, receivables, payables (+ tablas de auth)
├── auth.ts            # Convex Auth con proveedor Google
├── http.ts            # rutas HTTP de auth
├── users.ts           # viewer + requireUserId
├── accounts.ts        # CRUD cuentas bancarias
├── receivables.ts     # CRUD por cobrar
└── payables.ts        # CRUD por pagar
src/
├── components/
│   ├── auth/LoginScreen.tsx
│   ├── dashboard/     # Dashboard, AccountsSection, ReceivablesSection, PayablesSection
│   └── ui/            # LedgerCard, botones, tokens de tono
├── lib/money.ts       # formato de moneda y parseo de montos
├── routes/            # TanStack Router (file-based)
└── styles/app.css     # design tokens (papel/tinta, semántica de color)
server.js              # servidor de producción (Bun: estáticos + SSR)
```

La moneda por defecto es USD; cámbiala en `src/lib/money.ts` (`CURRENCY`).
