"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useAction } from "convex/react";
import { useCustomer } from "autumn-js/react";
import { api } from "@/convex/_generated/api";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardFooter } from "@/components/ui/card";

import { Pricing } from "@/components/pricing";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const ISSUE_FEATURE_ID = "issues";
const PLAN_SUMMARY_COPY: Record<string, string> = {
	plus_plan: "Trial plan with onboarding support and baseline automations.",
	pro_plan: "Pro unlocks higher limits, live voice escalation, and faster incident routing.",
	pay_as_you_go: "Usage-based billing with unlimited issue throughput and enterprise response SLAs.",
};

function formatDate(timestamp?: number | null) {
	if (!timestamp) return null;
	try {
		const date = new Date(timestamp * 1000);
		return date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch (error) {
		console.warn("[billing] Failed to format date", { timestamp, error });
		return null;
	}
}

function BillingSkeleton() {
	return (
		<div className="container mx-auto max-w-6xl py-12">
			<div className="space-y-6">
				<div className="max-w-lg space-y-2">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<Card className="border-border/60 bg-card/80">
						<CardHeader>
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-[420px] w-full" />
						</CardContent>
					</Card>
					<div className="space-y-4">
						<Card className="border-border/60 bg-card/80">
							<CardHeader>
								<Skeleton className="h-5 w-40" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-full" />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

function RedirectToSignIn() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/auth/sign-in?next=/billing");
	}, [router]);
	return <BillingSkeleton />;
}

function usageSummary(feature: any) {
	if (!feature) {
		return {
			usage: 0,
			quota: 0,
			percentage: 0,
			message: "Usage tracked once you start creating issues.",
		};
	}

	const usage = feature.usage ?? 0;
	const included = feature.included_usage ?? feature.usage_limit ?? 0;
	const unlimited = feature.unlimited ?? false;
	const quota = unlimited ? Infinity : included;
	const denominator = quota && quota !== Infinity ? quota : usage > 0 ? usage : 1;
	const percentage = Math.min(100, Math.round((usage / denominator) * 100));

	let message = `Tracked ${usage} issue${usage === 1 ? "" : "s"}`;
	if (quota === Infinity) {
		message += " • Pay-as-you-go pricing";
	} else if (quota > 0) {
		message += ` of ${quota} included`;
	}

	return { usage, quota, percentage, message };
}

function currentPlan(customer: ReturnType<typeof useCustomer>["customer"]) {
	if (!customer || !customer.products) return null;
	return customer.products.find((product) => product.status === "active") ?? null;
}

function nextRenewalAt(product: ReturnType<typeof currentPlan>) {
	if (!product?.current_period_end) return null;
	return formatDate(product.current_period_end);
}

function BillingContent() {
	const { toast } = useToast();
	const [managing, setManaging] = useState(false);
	const { customer, isLoading, error, refetch } = useCustomer({
		errorOnNotFound: false,
		// Expand invoices for sidebar history if available in future revisions
	});
	const openBillingPortal = useAction(api.actions.autumn.openBillingPortal);

	const plan = useMemo(() => currentPlan(customer), [customer]);
	const issuesFeature = customer?.features?.[ISSUE_FEATURE_ID];
	const usage = useMemo(() => usageSummary(issuesFeature), [issuesFeature]);
	const renewal = useMemo(() => nextRenewalAt(plan), [plan]);
	const hasPaymentMethod = Boolean(customer?.payment_method);
	const planCopy = plan?.id ? PLAN_SUMMARY_COPY[plan.id] ?? PLAN_SUMMARY_COPY.plus_plan : PLAN_SUMMARY_COPY.plus_plan;

	const handleBillingPortal = async () => {
		setManaging(true);
		try {
			const result = await openBillingPortal({ returnPath: "/billing" });
			if (result?.error) {
				toast({
					variant: "destructive",
					title: "Could not open billing portal",
					description: result.error.message ?? "Stripe returned an unexpected error.",
				});
				return;
			}
			const url = result?.data?.url ?? (result as any)?.url;
			if (url) {
				window.location.assign(url);
				return;
			}
			toast({
				title: "Portal unavailable",
				description: "We couldn’t locate a Stripe portal for this account yet.",
			});
		} catch (portalError) {
			console.error("[billing] Failed to open portal", portalError);
			toast({
				variant: "destructive",
				title: "Billing unavailable",
				description: portalError instanceof Error ? portalError.message : "Unexpected error opening billing portal.",
			});
		} finally {
			setManaging(false);
		}
	};

	if (error) {
		return (
			<div className="container mx-auto max-w-4xl py-12">
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
					<h2 className="text-lg font-semibold text-destructive">Billing is cooling off</h2>
					<p className="mt-2 text-sm text-destructive/80">
						We couldn&apos;t load your billing profile. Refresh the page or contact support if the issue persists.
					</p>
					<Button
						className="mt-4"
						variant="outline"
						onClick={() => {
							refetch();
						}}
					>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
			<div className="flex flex-col gap-10">
				<header className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Billing &amp; plans</h1>
					<p className="text-sm text-muted-foreground sm:max-w-2xl">
						DialZero automatically tracks metered issue usage. Upgrade whenever you need more volume or additional channels.
					</p>
				</header>
				<div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
					<div className="space-y-6">
						<Card className="border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
							<CardHeader className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div>
										<p className="text-xs font-medium uppercase tracking-widest text-primary/80">Current plan</p>
										<h2 className="text-2xl font-semibold leading-tight">
											{plan?.name ?? "Plus plan"}
										</h2>
									</div>
									<Badge variant="outline" className={cn("uppercase", plan ? "border-primary/40 text-primary" : "border-amber-500/60 text-amber-500")}> 
										{plan ? plan.status.replace("-", " ") : "trial"}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground/90">{planCopy}</p>
							</CardHeader>
							<CardContent className="grid gap-4 text-sm sm:grid-cols-3">
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Renewal</p>
									<p className="mt-1 font-medium">{renewal ?? (plan ? "Auto-renews" : "After trial")}</p>
								</div>
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment method</p>
									<p className="mt-1 font-medium">{hasPaymentMethod ? "Card on file" : "Needs card"}</p>
								</div>
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issues this cycle</p>
									<p className="mt-1 font-medium">{usage.usage}{usage.quota && usage.quota !== Infinity ? ` / ${usage.quota}` : ""}</p>
								</div>
							</CardContent>
							<CardFooter className="flex flex-wrap items-center justify-between gap-3">
								<div className="text-xs text-muted-foreground">
									Need to update receipts or ownership? Manage everything in the billing portal.
								</div>
								<Button
									variant="secondary"
									onClick={handleBillingPortal}
									disabled={managing || isLoading}
								>
									{managing ? (
										<span className="inline-flex items-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin" />
											Redirecting…
										</span>
									) : (
										<span className="inline-flex items-center gap-2">
											Manage billing
											<ExternalLink className="h-4 w-4" />
										</span>
									)}
								</Button>
							</CardFooter>
						</Card>

						<Card className="border-border/60 bg-card/95">
							<CardHeader>
								<CardTitle>Usage this cycle</CardTitle>
								<CardDescription>Stay ahead of limits and overages.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between text-sm">
									<span>Issues tracked</span>
									<span>
										{usage.usage}
										{usage.quota && usage.quota !== Infinity ? ` / ${usage.quota}` : usage.quota === Infinity ? " • unlimited" : ""}
									</span>
								</div>
								<Progress value={usage.percentage} className="h-2" />
								<p className="text-xs text-muted-foreground">{usage.message}</p>
							</CardContent>
						</Card>
					</div>

					<aside className="space-y-6">
						<Card className="border-border/60 bg-card/90">
							<CardHeader className="space-y-2">
								<CardTitle>Choose the coverage that fits</CardTitle>
								<CardDescription>
									Select a tier to unlock higher dispute throughput, additional channels, and better overage pricing.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Pricing
									heading="Straightforward, usage-aware pricing"
									description="Plans scale with how many issues your automation pipeline resolves each month."
									variant="billing"
								/>
							</CardContent>
						</Card>
					</aside>
				</div>
			</div>
		</div>
	);
}

export default function BillingPage() {
	return (
		<>
			<AuthLoading>
				<BillingSkeleton />
			</AuthLoading>
			<Unauthenticated>
				<RedirectToSignIn />
			</Unauthenticated>
			<Authenticated>
				<BillingContent />
			</Authenticated>
		</>
	);
}
