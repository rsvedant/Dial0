import { Autumn } from "@useautumn/convex";
import { components } from "./_generated/api";
import { authComponent } from "./auth";

const SECRET_KEY = process.env.AUTUMN_SECRET_KEY ?? "";

export const autumn = new Autumn(components.autumn, {
	secretKey: SECRET_KEY,
	identify: async (ctx: any) => {
		const identity = await ctx.auth.getUserIdentity();
		const authUser = await authComponent.getAuthUser(ctx);
		const derivedUserId =
			authUser?.userId || (authUser as any)?._id || identity?.subject || undefined;

		if (!derivedUserId) {
			return null;
		}

		return {
			customerId: derivedUserId,
			customerData: {
				name: (authUser as any)?.name ?? identity?.name ?? undefined,
				email: (authUser as any)?.email ?? identity?.email ?? undefined,
			},
		};
	},
});

export const {
    track,
    cancel,
    query,
    attach,
    check,
    checkout,
    usage,
    setupPayment,
    createCustomer,
    listProducts,
    billingPortal,
    createReferralCode,
    redeemReferralCode,
    createEntity,
    getEntity,
} = autumn.api();
