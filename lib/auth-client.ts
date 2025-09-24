import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins"
import { twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    passkeyClient(),
    twoFactorClient(),
  ],
});