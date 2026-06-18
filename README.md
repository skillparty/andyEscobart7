# Cuentas Claras

Gestor de finanzas personales: tus cuentas bancarias, lo que te deben y lo que debes, en un solo lugar. Inicio de sesión con Google.

**Stack:** [TanStack Start](https://tanstack.com/start) · [Convex](https://convex.dev) (base de datos + backend en tiempo real) · [Convex Auth](https://labs.convex.dev/auth) (Google OAuth) · [Bun](https://bun.sh) · [Biome](https://biomejs.dev) · [Tailwind CSS 4](https://tailwindcss.com) · [Railway](https://railway.com)

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

## Deploy en Railway

El repo incluye `railway.json` (Nixpacks: `bun install && bun run build`, arranque con `bun server.js`).

Convex producción y Railway se configuran por separado: Convex aloja el backend, Railway solo sirve el frontend SSR apuntando a la URL de producción de Convex.

1. **Despliega el backend de Convex a producción** (genera el deployment prod y su URL):
   ```bash
   bunx convex deploy
   ```
2. **Configura las variables del deployment de producción de Convex.** `SITE_URL` debe ser la URL pública de Railway (se usa para los redirects de OAuth):
   ```bash
   bunx convex env set --prod AUTH_GOOGLE_ID <client-id>
   bunx convex env set --prod AUTH_GOOGLE_SECRET <client-secret>
   bunx convex env set --prod SITE_URL https://<tu-app>.up.railway.app
   ```
3. **Agrega la redirect URI de producción** en Google Cloud Console:
   `https://<tu-deployment-prod>.convex.site/api/auth/callback/google`
4. **Crea el servicio en Railway** desde este repo y define en *build*:
   - `VITE_CONVEX_URL` = URL de producción de Convex (`https://<...>.convex.cloud`). Se incrusta en el bundle, por eso es necesaria en build.

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
server.js              # servidor de producción (Bun: estáticos + SSR)
```

Los montos se guardan como **centavos enteros**; la moneda es **BOB**. Para cambiarla, ajusta `CURRENCY` y el locale en `src/lib/money.ts`.
