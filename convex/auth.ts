import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { passkey } from "better-auth/plugins/passkey"
import { twoFactor, magicLink } from "better-auth/plugins";

const siteUrl = process.env.NGROK_WEBHOOK_URL ? process.env.NGROK_WEBHOOK_URL : process.env.SITE_URL;
console.log(siteUrl)

type ClientContextPayload = {
  ip?: string;
  ipChain?: string;
  userAgent?: string;
  city?: string;
  region?: string;
  country?: string;
};

function extractClientContext(request?: Request | null): ClientContextPayload | undefined {
  if (!request) return undefined;
  const headers = request.headers;
  if (!headers) return undefined;
  const get = (name: string) => headers.get(name)?.trim() || undefined;
  const ipChain =
    get("x-forwarded-for") ||
    get("cf-connecting-ip") ||
    get("x-real-ip") ||
    get("x-client-ip");
  const ip = ipChain?.split(",")[0]?.trim();
  const context: ClientContextPayload = {
    ip,
    ipChain,
    userAgent: get("user-agent"),
    city: get("x-vercel-ip-city") || get("cf-ipcity"),
    region: get("x-vercel-ip-region") || get("cf-region"),
    country: get("x-vercel-ip-country") || get("cf-ipcountry"),
  };
  const hasValue = Boolean(
    context.ip ||
      context.ipChain ||
      context.userAgent ||
      context.city ||
      context.region ||
      context.country,
  );
  return hasValue ? context : undefined;
}
export const authComponent = createClient<DataModel>(components.betterAuth, {
  triggers: {
    user: {
      onCreate: async (ctx, authUser: any) => {
        const updatedAt = new Date().toISOString();
        try {
          const userId = (authUser._id || authUser.id || authUser.userId) as string;
          console.log("[BetterAuth:onCreate] user keys=", Object.keys(authUser), "resolvedUserId=", userId);
          if (!userId) {
            console.warn("[BetterAuth:onCreate] No userId resolved; aborting settings insert");
            return;
          }
          const existing = await ctx.db
            .query("settings")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .take(1);
          console.log("[BetterAuth:onCreate] existing settings count=", existing.length);
          if (!existing[0]) {
            const name: string | undefined = authUser.name;
            let firstName: string | undefined = undefined;
            let lastName: string | undefined = undefined;
            if (name) {
              const parts = name.split(" ");
              firstName = parts[0];
              lastName = parts.slice(1).join(" ") || undefined;
            }
            // Attempt to get timezone from authUser metadata or use a default
            // Note: The actual timezone will be detected and updated by SettingsBootstrap on the client
            const timezone = (authUser as any).timezone || undefined;
            
            const doc = {
              userId,
              email: authUser.email || undefined,
              firstName,
              lastName,
              address: undefined,
              birthdate: undefined,
              phone: undefined,
              timezone,
              voiceId: undefined,
              selectedVoice: "cgSgspJ2msm6clMCkdW9", // Default: Jessica (popular 11Labs voice)
              updatedAt,
            };
            const insertedId = await ctx.db.insert("settings", doc as any);
            console.log("[BetterAuth:onCreate] inserted settings id=", insertedId, doc);
          }
        } catch (e) {
          console.error("[BetterAuth:onCreate] failed:", e);
        }
      },
      onUpdate: async (ctx, oldUser: any, newUser: any) => {
        try {
          const userId = (newUser._id || newUser.id || newUser.userId) as string;
          console.log("[BetterAuth:onUpdate] user keys=", Object.keys(newUser), "resolvedUserId=", userId);
          if (!userId) return;
          const latest = await ctx.db
            .query("settings")
            .withIndex("by_userId", q => q.eq("userId", userId))
            .order("desc")
            .take(1);
          console.log("[BetterAuth:onUpdate] latest settings rows=", latest.length);
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
            console.log("[BetterAuth:onUpdate] patched settings id=", latest[0]._id);
          } else {
            console.warn("[BetterAuth:onUpdate] No settings row to patch for user, skipping");
          }
        } catch (e) {
          console.error("[BetterAuth:onUpdate] failed:", e);
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
    // Allow both local dev and tunnel/external origins.
    // Resolves: Invalid origin errors when frontend runs on localhost but baseURL / email links use ngrok.
    trustedOrigins: [
      process.env.NGROK_WEBHOOK_URL,
      process.env.SITE_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean) as string[],
    user: {
        deleteUser: { 
            enabled: true
        } 
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string, 
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
      }
    },
    baseURL: process.env.SITE_URL,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url, token }, request) => {
        try {
          const clientContext = extractClientContext(request);
          const res = await fetch(`${siteUrl}/api/auth/send-reset-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
            },
            body: JSON.stringify({
              user: { email: user.email, name: user.name },
              url,
              token,
              clientContext,
            }),
          });
          if (!res.ok) {
            console.error("[sendResetPassword] Proxy route failed", await res.text());
          }
        } catch (e) {
          console.error("[sendResetPassword] Proxy request error", e);
        }
      },
      onPasswordReset: async ({ user }, request) => {
        console.log("[onPasswordReset] Password reset for", user?.email);
      },
    },
    emailVerification: {
      sendVerificationEmail: async (data, request) => {
        const { user, url, token } = data;
        try {
          const clientContext = extractClientContext(request);
          // Call Next.js API route to send the email using the original template.
          const res = await fetch(`${siteUrl}/api/auth/send-verification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
            },
            body: JSON.stringify({
              user: { email: user.email, name: user.name },
              url,
              token,
              clientContext,
            }),
          });
          if (!res.ok) {
            console.error("[sendVerificationEmail] Proxy route failed", await res.text());
          }
        } catch (e) {
          console.error("[sendVerificationEmail] Proxy request error", e);
        }
      },
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
      passkey(),
      twoFactor({
        otpOptions: {
          sendOTP: async ({ user, otp }, request) => {
            try {
              const clientContext = extractClientContext(request);
              const res = await fetch(`${siteUrl}/api/auth/send-2fa-otp`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
                },
                body: JSON.stringify({
                  user: { email: user.email, name: user.name },
                  otp,
                  clientContext,
                }),
              });
              if (!res.ok) {
                console.error("[sendOTP] Proxy route failed", await res.text());
              }
            } catch (e) {
              console.error("[sendOTP] Proxy request error", e);
            }
          },
        },
        skipVerificationOnEnable: true,
      }),
      magicLink({
        sendMagicLink: async ({ email, url, token }, request) => {
          try {
            const clientContext = extractClientContext(request);
            const res = await fetch(`${siteUrl}/api/auth/send-magic-link`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
              },
              body: JSON.stringify({ email, url, token, clientContext }),
            });
            if (!res.ok) {
              console.error("[sendMagicLink] Proxy route failed", await res.text());
            }
          } catch (e) {
            console.error("[sendMagicLink] Proxy request error", e);
          }
        },
      }),

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
