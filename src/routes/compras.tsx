import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { ComprasPage } from "~/components/compras/ComprasPage";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

export const Route = createFileRoute("/compras")({
  component: ComprasRoute,
});

function ComprasRoute() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <ComprasPage />
      </Authenticated>
    </>
  );
}
