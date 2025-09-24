import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth, {
  triggers: {
    user: {
      onCreate: async (ctx, authUser: any) => {
        const updatedAt = new Date().toISOString();
        const userId = (authUser._id as unknown as string);
        // Insert initial settings doc if not exists
        const existing = await ctx.db
          .query("settings")
          .withIndex("by_userId", q => q.eq("userId", userId))
          .take(1);
        if (!existing[0]) {
          const name: string | undefined = authUser.name;
          let firstName: string | undefined = undefined;
            let lastName: string | undefined = undefined;
          if (name) {
            const parts = name.split(" ");
            firstName = parts[0];
            lastName = parts.slice(1).join(" ") || undefined;
          }
          await ctx.db.insert("settings", {
            userId,
            email: authUser.email || undefined,
            firstName,
            lastName,
            updatedAt,
          });
        }
      },
      onUpdate: async (ctx, oldUser: any, newUser: any) => {
        const userId = (newUser._id as unknown as string);
        const latest = await ctx.db
          .query("settings")
          .withIndex("by_userId", q => q.eq("userId", userId))
          .order("desc")
          .take(1);
        if (latest[0]) {
          const updatedAt = new Date().toISOString();
          const name: string | undefined = newUser.name;
          let firstName: string | undefined = undefined;
          let lastName: string | undefined = undefined;
          if (name) {
            const parts = name.split(" ");
            firstName = parts[0];
            lastName = parts.slice(1).join(" ") || undefined;
          }
          await ctx.db.patch(latest[0]._id, {
            email: newUser.email || undefined,
            firstName,
            lastName,
            updatedAt,
          });
        }
      },
    },
  },
});

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Debug helper to inspect raw Convex auth identity vs Better Auth user document
export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const authUser = await authComponent.getAuthUser(ctx);
    const derivedUserId = authUser?.userId || (authUser as any)?._id || identity?.subject;
    return {
      identity,
      authUser,
      identitySubject: identity?.subject,
      authUserId: derivedUserId,
      // Helpful flags
      hasIdentity: !!identity,
      hasAuthUser: !!authUser,
    };
  },
});