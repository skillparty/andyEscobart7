import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { LoginScreen } from "~/components/auth/LoginScreen";
import { PreciosPage } from "~/components/personal/PreciosPage";
import { LoadingScreen } from "~/components/ui/LoadingScreen";

export const Route = createFileRoute("/precios")({
  component: PreciosRoute,
});

function PreciosRoute() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <PreciosPage />
      </Authenticated>
    </>
  );
}
