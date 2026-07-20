import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { KardexPage } from "~/components/kardex/KardexPage";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

export const Route = createFileRoute("/kardex")({
  component: KardexRoute,
});

function KardexRoute() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <KardexPage />
      </Authenticated>
    </>
  );
}
