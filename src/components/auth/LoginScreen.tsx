import { useAuthActions } from "@convex-dev/auth/react";
import type * as React from "react";
import { useState } from "react";
import { BrandMark } from "~/components/ui/BrandMark";
import { formatMoney } from "~/lib/money";
import { IguanaAccountant } from "./IguanaAccountant";

const TRUST_CHIPS = ["Privado", "Sin costo", "Bolivianos (BOB)"] as const;

const SAMPLE_ROWS = [
  { label: "Cuenta de ahorros", amount: 124050 },
  { label: "María me debe", amount: 8500 },
  { label: "Alquiler de junio", amount: -45000 },
] as const;

export function LoginScreen() {
  const { signIn } = useAuthActions();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = () => {
    setIsSigningIn(true);
    void signIn("google").catch(() => setIsSigningIn(false));
  };

  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-labelledby="login-heading"
        className="relative flex flex-col justify-center overflow-hidden px-6 py-16 sm:px-12 lg:px-20"
      >
        {/* Atmósfera cálida detrás del titular */}
        <div
          aria-hidden="true"
          className="halo-drift pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-positive-soft opacity-50 blur-3xl"
        />

        <div className="relative">
          <div
            className="rise-in mb-8 flex items-center gap-2.5"
            style={{ animationDelay: "20ms" }}
          >
            <BrandMark size={32} />
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Cuentas Claras
            </span>
          </div>

          <h1
            id="login-heading"
            className="rise-in font-display text-[clamp(2.5rem,1.5rem+4vw,5rem)] font-semibold leading-[1.05] tracking-tight"
            style={{ animationDelay: "60ms" }}
          >
            Cuentas claras,
            <br />
            <em className="text-positive">amistades largas.</em>
          </h1>
          <p
            className="rise-in mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
            style={{ animationDelay: "120ms" }}
          >
            Tus cuentas bancarias, lo que te deben y lo que debes — todo en una
            sola libreta, siempre al día.
          </p>

          <ul
            className="rise-stagger mt-7 flex flex-wrap gap-2"
            style={{ "--stagger-base": "0.16s" } as React.CSSProperties}
          >
            {TRUST_CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-line bg-card/60 px-3 py-1 text-xs font-medium text-ink-soft"
              >
                {chip}
              </li>
            ))}
          </ul>

          <ul
            className="rise-stagger mt-10 max-w-md space-y-3 border-t border-line pt-6"
            style={{ "--stagger-base": "0.28s" } as React.CSSProperties}
            aria-hidden="true"
          >
            {SAMPLE_ROWS.map((row) => (
              <li key={row.label} className="flex items-baseline text-sm">
                <span className="text-ink-soft">{row.label}</span>
                <span className="ledger-dots" />
                <span
                  className={`font-medium tabular-nums ${
                    row.amount < 0 ? "text-debt" : "text-positive"
                  }`}
                >
                  {formatMoney(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-label="Iniciar sesión"
        className="flex items-center justify-center px-6 py-16 sm:px-12"
      >
        <div className="card-enter w-full max-w-sm rounded-3xl border border-line bg-card p-8 shadow-[0_8px_40px_oklch(0%_0_0/0.06)] sm:p-10">
          <div className="mb-8 flex justify-center text-ink-soft">
            <IguanaAccountant />
          </div>
          <h2 className="font-display text-2xl font-semibold">
            Entra a tu libreta
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Usa tu cuenta de Google. Sin contraseñas que recordar.
          </p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-paper px-5 py-3.5 text-sm font-semibold shadow-[0_1px_2px_oklch(0%_0_0/0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_oklch(0%_0_0/0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-y-0 disabled:opacity-60"
          >
            <GoogleLogo />
            {isSigningIn ? "Conectando…" : "Continuar con Google"}
          </button>
          <p className="mt-6 text-xs leading-relaxed text-ink-soft">
            Tus datos son privados: solo tú puedes ver tus cuentas y deudas.
          </p>
          {import.meta.env.VITE_E2E === "true" ? <E2ELogin /> : null}
        </div>
      </section>
    </main>
  );
}

/**
 * Formulario de acceso por email + contraseña para tests E2E. El bundle de
 * producción no define VITE_E2E, por lo que este árbol se elimina por
 * tree-shaking y nunca llega al usuario final.
 */
function E2ELogin() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void signIn("password", { email, password, flow: "signUp" });
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="e2e-login"
      className="mt-8 grid gap-2 border-t border-line pt-6"
    >
      <input
        aria-label="E2E email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-line px-3 py-2 text-sm"
      />
      <input
        aria-label="E2E password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-line px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper"
      >
        Entrar (E2E)
      </button>
    </form>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.18 7.18 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
