import {
	feature,
	product,
	featureItem,
	pricedFeatureItem,
	priceItem,
} from "atmn";

// Features
export const emails = feature({
	id: "emails",
	name: "Emails",
	type: "single_use",
});

export const voiceMinutes = feature({
	id: "voice_minutes",
	name: "Voice Minutes",
	type: "continuous_use",
});

export const issues = feature({
	id: "issues",
	name: "Issues",
	type: "single_use",
});

// Products
export const payAsYouGo = product({
	id: "pay_as_you_go",
	name: "Pay-As-You-Go",
	items: [
		pricedFeatureItem({
			feature_id: emails.id,
			price: 0.02,
			interval: "month",
			included_usage: 0,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: issues.id,
			price: 1.5,
			interval: "month",
			included_usage: 0,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: voiceMinutes.id,
			price: 0.35,
			interval: "month",
			included_usage: 0,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),
	],
});

export const plusPlan = product({
	id: "plus_plan",
	name: "Plus Plan",
	items: [
		priceItem({
			price: 49,
			interval: "month",
		}),

		pricedFeatureItem({
			feature_id: emails.id,
			price: 0.01,
			interval: "month",
			included_usage: 100,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: issues.id,
			price: 0.75,
			interval: "month",
			included_usage: 50,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: voiceMinutes.id,
			price: 0.25,
			interval: "month",
			included_usage: 50,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),
	],
	free_trial: {
		duration: "day",
		length: 14,
		unique_fingerprint: false,
		card_required: false,
	},
});

export const proPlan = product({
	id: "pro_plan",
	name: "Pro Plan",
	items: [
		priceItem({
			price: 199,
			interval: "month",
		}),

		pricedFeatureItem({
			feature_id: emails.id,
			price: 0.008,
			interval: "month",
			included_usage: 2000,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: issues.id,
			price: 0.5,
			interval: "month",
			included_usage: 200,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),

		pricedFeatureItem({
			feature_id: voiceMinutes.id,
			price: 0.2,
			interval: "month",
			included_usage: 300,
			billing_units: 1,
			usage_model: "pay_per_use",
		}),
	],
});
