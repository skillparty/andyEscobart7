# Cuentas Claras

Gestor de finanzas personales: tus cuentas bancarias, lo que te deben y lo que debes, en un solo lugar. Inicio de sesión con Google.

**Stack:** [TanStack Start](https://tanstack.com/start) · [Convex](https://convex.dev) (base de datos + backend en tiempo real) · [Convex Auth](https://labs.convex.dev/auth) (Google OAuth) · [Bun](https://bun.sh) · [Biome](https://biomejs.dev) · [Tailwind CSS 4](https://tailwindcss.com) · [Vercel](https://vercel.com)

## Funcionalidades

- **Cuentas bancarias** — nombre, banco (con logo) y saldo, con edición rápida del saldo. Editar el saldo a mano deja un **ajuste** en el historial para que todo cuadre.
- **Por cobrar** — quién te debe, cuánto y una nota. **Cobro total o parcial**, opcionalmente a una cuenta (suma al saldo).
- **Por pagar** — a quién le debes, la razón y el monto. **Pago total o parcial**, opcionalmente desde una cuenta (resta del saldo, con bloqueo si no alcanza).
- **Historial** — cada pago/cobro/ajuste queda registrado; se puede **revertir** un pago o cobro. Lista paginada ("cargar más").
- **Balance neto + gráficos** — saldo en cuentas + por cobrar − por pagar en tiempo real, con desglose y pagos por mes. Exportación a **PDF** (semana/mes).
- **Dinero sin errores de redondeo** — los montos se guardan como centavos enteros; moneda **BOB** (boliviano).
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
bun run test      # Vitest + convex-test (lógica de dinero y mutaciones)
bun run build     # vite build + tsc --noEmit
```

### Tests E2E (Playwright)

Los E2E (`tests/e2e/`) cubren el flujo real en el navegador: login, crear
cuenta, registrar y pagar una deuda, e historial. Como el login normal es solo
Google OAuth, los tests usan un provider de prueba (email + contraseña) que
**solo** se activa cuando el deployment de Convex tiene `AUTH_E2E="true"`. En
producción esa variable no existe, así que el provider nunca queda expuesto.

Preparación (una sola vez):

```bash
bunx playwright install        # navegadores
bunx convex env set AUTH_E2E true   # en tu deployment de DESARROLLO, nunca en prod
```

Ejecución:

```bash
bun run test:e2e        # corre los specs (levanta dev server con VITE_E2E=true)
bun run test:e2e:ui     # modo interactivo
```

> Nunca configures `AUTH_E2E` en el deployment de producción.

## Deploy en Vercel

El repo incluye `vercel.json`: `vite build` genera `dist/client` (estáticos) y `dist/server/server.js` (handler SSR). Vercel sirve los estáticos por filesystem y manda el resto a la función `api/index.ts`, que delega en ese handler. Convex aloja el backend; Vercel solo sirve el frontend SSR apuntando a la URL de producción de Convex.

1. **Despliega el backend de Convex a producción** (genera el deployment prod y su URL):
   ```bash
   bunx convex deploy
   ```
2. **Crea el proyecto en Vercel** desde este repo (framework: *Other*; el `vercel.json` define build y rutas). En *Environment Variables* agrega:
   - `VITE_CONVEX_URL` = URL de producción de Convex (`https://<...>.convex.cloud`). Se incrusta en el bundle, por eso es necesaria en build.

   El primer deploy te da la URL pública (`https://<tu-app>.vercel.app`).
3. **Configura las variables del deployment de producción de Convex.** `SITE_URL` es la URL pública de Vercel (se usa para los redirects de OAuth):
   ```bash
   bunx convex env set --prod AUTH_GOOGLE_ID <client-id>
   bunx convex env set --prod AUTH_GOOGLE_SECRET <client-secret>
   bunx convex env set --prod SITE_URL https://<tu-app>.vercel.app
   ```
4. **Agrega la redirect URI de producción** en Google Cloud Console:
   `https://<tu-deployment-prod>.convex.site/api/auth/callback/google`

> **Datos:** un deployment de producción nuevo arranca vacío, así que **no** ejecutes `migrations:dollarsToCents` ahí. Esa migración solo convierte data antigua en dólares-flotante (deployment local/dev previo a guardar en centavos); córrela una sola vez y solo donde exista esa data:
> ```bash
> bunx convex run migrations:dollarsToCents
> ```

## Estructura

```
convex/
├── schema.ts          # accounts, receivables, payables, transactions (+ auth)
├── auth.ts            # Convex Auth con proveedor Google
├── http.ts            # rutas HTTP de auth
├── users.ts           # viewer + requireUserId
├── accounts.ts        # CRUD cuentas; editar saldo registra un ajuste
├── receivables.ts     # CRUD + collect (cobro total/parcial)
├── payables.ts        # CRUD + pay (pago total/parcial, anti-overdraft)
├── transactions.ts    # historial: list (6m), page (paginado), reverse
├── migrations.ts      # dollarsToCents (única vez, data antigua)
└── *.test.ts          # Vitest + convex-test
src/
├── components/
│   ├── auth/LoginScreen.tsx
│   ├── dashboard/     # Dashboard, Accounts/Receivables/Payables/History/Charts
│   └── ui/            # LedgerCard, BankLogo/BankSelect, botones, tonos
├── lib/money.ts       # centavos enteros, formato BOB, parseo (+ money.test.ts)
├── lib/pdf.ts         # exportación a PDF (jsPDF, carga diferida)
├── routes/            # TanStack Router (file-based)
└── styles/app.css     # design tokens (papel/tinta, semántica de color)
api/index.ts           # función SSR de Vercel (delega al handler de build)
vercel.json            # build + ruteo (estáticos por filesystem, resto a SSR)
```

Los montos se guardan como **centavos enteros**; la moneda es **BOB**. Para cambiarla, ajusta `CURRENCY` y el locale en `src/lib/money.ts`.
