import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { InventarioPage } from "~/components/inventario/InventarioPage";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

export const Route = createFileRoute("/inventario")({
  component: InventarioRoute,
});

function InventarioRoute() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <InventarioPage />
      </Authenticated>
    </>
  );
}
