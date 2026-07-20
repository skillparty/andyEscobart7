import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { LoadingScreen } from "~/components/ui/LoadingScreen";
import { VentasPage } from "~/components/ventas/VentasPage";

export const Route = createFileRoute("/ventas")({
  component: VentasRoute,
});

function VentasRoute() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <VentasPage />
      </Authenticated>
    </>
  );
}
