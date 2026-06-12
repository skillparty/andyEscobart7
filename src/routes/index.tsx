import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { Dashboard } from "~/components/dashboard/Dashboard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <AuthLoading>
        <main className="grid min-h-dvh place-items-center">
          <p className="font-display text-lg text-ink-soft">Cargando…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  );
}
