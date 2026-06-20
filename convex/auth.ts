import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Proveedor de prueba con email + contraseña. SOLO se registra cuando el
// deployment de Convex tiene AUTH_E2E="true". En producción esa variable no
// existe, así que este provider nunca queda expuesto. Lo usan los tests E2E
// para iniciar sesión sin pasar por Google OAuth.
const e2eProviders = process.env.AUTH_E2E === "true" ? [Password()] : [];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, ...e2eProviders],
});
