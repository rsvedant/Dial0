"use node";
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Autumn as AutumnSDK } from "autumn-js";

import { autumn } from "../autumn";
import { authComponent } from "../auth";
import { internal } from "../_generated/api";

const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

if (!AUTUMN_SECRET_KEY) {
	console.warn("[convex/actions/autumn] AUTUMN_SECRET_KEY is not set; billing actions will fail");
}

const ISSUE_FEATURE_ID = "issues";

function buildSuccessUrl(successPath?: string | null) {
	const siteUrl = process.env.SITE_URL ?? process.env.NGROK_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
	if (!successPath) {
		return siteUrl;
	}
	try {
		return new URL(successPath, siteUrl ?? undefined).toString();
	} catch (error) {
		console.warn("[convex/actions/autumn] Failed to construct success URL", { successPath, siteUrl, error });
		return siteUrl ?? undefined;
	}
}

export const startPlanCheckout = action({
	args: {
		productId: v.string(),
		successPath: v.optional(v.string()),
	},
	handler: async (ctx, { productId, successPath }) => {
		const customer = await authComponent.getAuthUser(ctx);
		if (!customer) {
			throw new Error("User must be authenticated to start checkout");
		}

		const successUrl = buildSuccessUrl(successPath) ?? undefined;
		const result = await autumn.checkout(ctx, {
			productId,
			successUrl,
		});

		if (result.error) {
			throw new Error(result.error.message ?? "Failed to start checkout");
		}

		return {
			...result,
			flow: "checkout" as const,
		};
	},
});

export const confirmPlanAttachment = action({
	args: {
		productId: v.string(),
		invoice: v.optional(v.boolean()),
	},
	handler: async (ctx, { productId, invoice }) => {
		const customer = await authComponent.getAuthUser(ctx);
		if (!customer) {
			throw new Error("User must be authenticated to confirm plan changes");
		}

		const result = await autumn.attach(ctx, {
			productId,
			invoice: invoice ?? false,
		});

		if (result.error) {
			throw new Error(result.error.message ?? "Failed to confirm plan change");
		}

		return result;
	},
});

export const openBillingPortal = action({
	args: {
		returnPath: v.optional(v.string()),
	},
	handler: async (ctx, { returnPath }) => {
		const customer = await authComponent.getAuthUser(ctx);
		if (!customer) {
			throw new Error("User must be authenticated to open billing portal");
		}

		const response = await autumn.customers.billingPortal(ctx, {
			returnUrl: buildSuccessUrl(returnPath) ?? undefined,
		});

		if (response.error) {
			throw new Error(response.error.message ?? "Unable to load billing portal");
		}

		return response;
	},
});

export const trackIssueUsage = internalAction({
	args: {
		userId: v.string(),
		value: v.optional(v.number()),
		metadata: v.optional(v.object({
			issueId: v.optional(v.string()),
		})),
	},
	handler: async (ctx, { userId, value, metadata }) => {
		if (!AUTUMN_SECRET_KEY) {
			throw new Error("AUTUMN_SECRET_KEY is not configured");
		}

		const autumnSdk = new AutumnSDK({
			secretKey: AUTUMN_SECRET_KEY,
		});

		const profile = await ctx.runQuery(
			internal.orchestration.getSettingsForUserId,
			{ userId },
		);

		const nameParts: string[] = [];
		if (profile?.firstName) nameParts.push(profile.firstName);
		if (profile?.lastName) nameParts.push(profile.lastName);

		const customerData: { name?: string; email?: string } = {};
		if (nameParts.length > 0) {
			customerData.name = nameParts.join(" ");
		}
		if (profile?.email) {
			customerData.email = profile.email;
		}

		try {
			await autumnSdk.track({
				customer_id: userId,
				feature_id: ISSUE_FEATURE_ID,
				value: value ?? 1,
				...(Object.keys(customerData).length > 0 ? { customer_data: customerData } : {}),
				...(metadata?.issueId ? { properties: { issueId: metadata.issueId } } : {}),
			});
		} catch (error) {
			console.error("[convex/actions/autumn] Failed to track issue usage", {
				error,
				userId,
				metadata,
			});
		}

		return null;
	},
});
