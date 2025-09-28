"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePricingTable, useCustomer } from "autumn-js/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CircleCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PricingVariant = "marketing" | "billing";
type PricingProduct = NonNullable<ReturnType<typeof usePricingTable>["products"]>[number];

interface PricingProps {
  heading?: string;
  description?: string;
  variant?: PricingVariant;
}

interface PricingCardState {
  product: PricingProduct;
  isActive: boolean;
  isScheduled: boolean;
}

const DEFAULT_HEADING = "Pricing";
const DEFAULT_DESCRIPTION = "Choose the plan that fits your automation volume. Upgrade anytime.";
const PRODUCT_SEQUENCE = ["plus_plan", "pro_plan", "pay_as_you_go"] as const;
const PLAN_DESCRIPTIONS: Record<string, string> = {
  plus_plan: "Two-week free trial with core automations and guided onboarding.",
  pro_plan: "Expanded limits, live voice escalation, and advanced routing controls.",
  pay_as_you_go: "Unlimited issue throughput with usage-based billing and enterprise support SLAs.",
};

function scenarioLabel(
  scenario: PricingProduct["scenario"] | undefined,
  variant: PricingVariant,
  productRank: number,
  currentRank: number | null,
) {
  if (!scenario) {
    return variant === "billing" ? "Select plan" : "Get started";
  }

  let normalized: PricingProduct["scenario"] | "upgrade" = scenario;
  if (
    variant === "billing" &&
    scenario === "downgrade" &&
    productRank > (currentRank ?? -1)
  ) {
    normalized = "upgrade";
  }

  switch (normalized) {
    case "active":
      return variant === "billing" ? "Current plan" : "Active";
    case "scheduled":
      return "Scheduled";
    case "upgrade":
      return "Upgrade";
    case "downgrade":
      return "Downgrade";
    case "renew":
      return "Renew";
    case "cancel":
      return variant === "billing" ? "Re-activate" : "Rejoin";
    default:
      return variant === "billing" ? "Select plan" : "Get started";
  }
}

function isSelectable(state: PricingCardState) {
  if (state.isActive) return false;
  if (state.product.scenario === "scheduled") return false;
  return true;
}

function getActiveProductIds(customer: ReturnType<typeof useCustomer>["customer"] | null) {
  if (!customer?.products) return new Set<string>();
  return new Set(customer.products.filter(p => p.status === "active").map(p => p.id));
}

function getScheduledProductIds(customer: ReturnType<typeof useCustomer>["customer"] | null) {
  if (!customer?.products) return new Set<string>();
  return new Set(customer.products.filter(p => p.status === "scheduled").map(p => p.id));
}

function formatIntervalLabel(interval?: string | null) {
  if (!interval) return null;
  switch (interval) {
    case "month":
      return "per month";
    case "year":
      return "per year";
    case "week":
      return "per week";
    case "day":
      return "per day";
    case "quarter":
      return "per quarter";
    case "semi_annual":
      return "per 6 months";
    case "minute":
    case "hour":
      return `per ${interval}`;
    case "multiple":
      return "per cycle";
    default:
      return null;
  }
}

// short interval suffix like "/mo"
function intervalShort(interval?: string | null) {
  if (!interval) return null;
  switch (interval) {
    case "month":
      return "/mo";
    case "year":
      return "/yr";
    case "week":
      return "/wk";
    case "day":
      return "/day";
    case "quarter":
      return "/qtr";
    case "semi_annual":
      return "/6mo";
    case "minute":
      return "/min";
    case "hour":
      return "/hr";
    default:
      return null;
  }
}

function formatPriceSummary(product: PricingProduct) {
  const recurringPrice = product.items?.find(
    (item) => item.type === "price" && typeof item.price === "number",
  );
  const price = recurringPrice?.price;
  const interval = recurringPrice?.interval ?? product.properties?.interval_group ?? null;

  let primary = "Usage-based";
  if (typeof price === "number") {
    primary =
      price === 0
        ? "Free"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: price % 1 === 0 ? 0 : 2,
          }).format(price);
  }

  const secondary = formatIntervalLabel(interval ?? null);
  return { primary, secondary, interval: interval ?? null };
}

function getPlanDescription(product: PricingProduct) {
  if (PLAN_DESCRIPTIONS[product.id]) return PLAN_DESCRIPTIONS[product.id];
  return (
    product.display?.description ??
    product.display?.name ??
    "Usage-based automation credits with live dispute resolution."
  );
}

// Build feature list lines. Avoids feature.unit (not in types) and infers a sensible unit from the primary text.
function describeItem(item: PricingProduct["items"][number]) {
  if (item.type === "price") return null;

  const primary =
    item.display?.primary_text ??
    item.feature?.name ??
    (item.feature_id ? `Includes ${item.feature_id}` : undefined);

  if (!primary) return null;

  let secondary = item.display?.secondary_text ?? undefined;

  if (!secondary) {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    // Try to infer unit from the primary text (e.g., "50 voice minutes" -> "voice minute")
    const unitMatch = primary.match(/\d[\d,.]*\s+(.+)/);
    const unitPlural = unitMatch ? unitMatch[1].trim() : undefined;
    const unitSingular =
      unitPlural && unitPlural.endsWith("s") ? unitPlural.slice(0, -1) : unitPlural;

    // If plan includes some usage and has an overage price, show a muted "then $X per <unit>"
    if (
      typeof (item as any).included_usage === "number" &&
      (item as any).included_usage > 0 &&
      typeof (item as any).price === "number"
    ) {
      secondary = `then ${fmt((item as any).price)} per ${unitSingular ?? "unit"}`;
    } else if (item.usage_model === "pay_per_use" && typeof (item as any).price === "number") {
      // For pure pay-per-use lines; we’ll hide these on the PAYG card in render
      secondary = `${fmt((item as any).price)} per ${unitSingular ?? "unit"}`;
    }
  }

  return { primary, secondary };
}

export function Pricing({
  heading = DEFAULT_HEADING,
  description = DEFAULT_DESCRIPTION,
  variant = "marketing",
}: PricingProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { products, isLoading, error } = usePricingTable();
  const { customer, isLoading: customerLoading, refetch } = useCustomer({
    errorOnNotFound: false,
  });
  const startPlanCheckout = useAction(api.actions.autumn.startPlanCheckout);
  const confirmPlanAttachment = useAction(api.actions.autumn.confirmPlanAttachment);

  const planOrder = useMemo(
    () => new Map(PRODUCT_SEQUENCE.map((id, index) => [id, index])),
    [],
  );

  const activeProductIds = useMemo(() => getActiveProductIds(customer), [customer]);
  const scheduledProductIds = useMemo(() => getScheduledProductIds(customer), [customer]);

  const currentPlanId = useMemo(() => {
    const activePlan = customer?.products?.find((p) => p.status === "active");
    return activePlan?.id ?? null;
  }, [customer]);

  const currentPlanRank = useMemo(
    () =>
      currentPlanId
        ? planOrder.get(currentPlanId as "pay_as_you_go" | "plus_plan" | "pro_plan") ?? null
        : null,
    [currentPlanId, planOrder],
  );

  const handlePlanSelect = useCallback(
    async (product: PricingProduct) => {
      if (variant !== "billing") {
        try {
          const target = `/auth/sign-in?plan=${product.id}`;
          if (typeof window !== "undefined") window.location.assign(target);
          else router.push(target);
        } catch (navigationError) {
          console.error("Failed to navigate to sign-in", navigationError);
        }
        return;
      }

      setSelectedProductId(product.id);
      try {
        const result = await startPlanCheckout({
          productId: product.id,
          successPath: "/billing?status=completed",
        });

        const checkoutUrl =
          result?.data?.url ??
          (result as any)?.data?.checkout_url ??
          (result as any)?.checkout_url;
        if (checkoutUrl) {
          window.location.assign(checkoutUrl);
          return;
        }

        const checkoutError = result?.error;
        if (checkoutError) {
          toast({
            variant: "destructive",
            title: "Unable to start checkout",
            description: checkoutError.message ?? "Autumn returned an unexpected error.",
          });
          return;
        }

        const preview = (result as any)?.data?.preview;
        if (preview) {
          const title = preview.title ?? "Confirm plan change";
          const message = preview.message ?? `Confirm switching to ${product.name}?`;
          const proceed = window.confirm(`${title}\n\n${message}`);
          if (!proceed) return;
        }

        try {
          await confirmPlanAttachment({ productId: product.id });
          toast({ title: "Plan updated", description: `You're now on ${product.name}.` });
          await refetch();
        } catch (attachError) {
          console.error("Failed to confirm plan", attachError);
          toast({
            variant: "destructive",
            title: "Unable to confirm plan",
            description:
              attachError instanceof Error
                ? attachError.message
                : "Unexpected error confirming billing plan.",
          });
        }
      } catch (planError) {
        console.error("Failed to attach Autumn product", planError);
        toast({
          variant: "destructive",
          title: "Plan change failed",
          description:
            planError instanceof Error ? planError.message : "Unexpected error triggering checkout.",
        });
      } finally {
        setSelectedProductId(null);
      }
    },
    [router, startPlanCheckout, confirmPlanAttachment, toast, refetch, variant],
  );

  const renderCard = useCallback(
    (card: PricingCardState) => {
      const { product, isActive } = card;
      const productRank =
        planOrder.get(product.id as "pay_as_you_go" | "plus_plan" | "pro_plan") ??
        PRODUCT_SEQUENCE.length;
      const disabled = variant === "billing" ? !isSelectable(card) : false;
      const isLoadingState = selectedProductId === product.id;
      const { primary: pricePrimary, interval } = formatPriceSummary(product);
      const label = scenarioLabel(product.scenario, variant, productRank, currentPlanRank);
      const listItems =
        product.items
          ?.map(describeItem)
          .filter(
            (item): item is NonNullable<ReturnType<typeof describeItem>> => Boolean(item),
          ) ?? [];
      const priceSuffix = intervalShort(interval);

      return (
        <Card
          key={product.id}
          className={cn(
            "flex flex-col justify-between border-border/60 bg-card/90 backdrop-blur transition-all duration-200 hover:shadow-lg",
            "h-[460px]",
            isActive && "ring-2 ring-primary shadow-lg",
          )}
        >
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg font-semibold leading-tight">
                  {product.name}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  {getPlanDescription(product)}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-baseline gap-2 pt-0 whitespace-nowrap">
              <span className="text-3xl font-semibold tracking-tight">{pricePrimary}</span>
              {priceSuffix ? (
                <span className="text-sm text-muted-foreground">{priceSuffix}</span>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-1 pb-2 flex-1">
            <Separator className="bg-border/60" />
            <ul className="space-y-2 pt-1">
              {listItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-left">
                  <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-black dark:text-white" />
                  <div className="space-y-0.5">
                    <p className="font-medium leading-tight text-sm">{item.primary}</p>
                    {product.id !== "pay_as_you_go" && item.secondary ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.secondary}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="pt-0 pb-4">
            <Button
              onClick={() => handlePlanSelect(product)}
              className="w-full h-10"
              variant={isActive ? "secondary" : "default"}
              disabled={disabled || isLoadingState || customerLoading}
            >
              {isLoadingState ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing
                </span>
              ) : (
                <label className="font-medium">{label}</label>
              )}
            </Button>
          </CardFooter>
        </Card>
      );
    },
    [customerLoading, handlePlanSelect, selectedProductId, variant, planOrder, currentPlanRank],
  );

  if (error) {
    return (
      <section className="py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-semibold">{heading}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            We couldn&apos;t load pricing at the moment. Please refresh or try again in a few minutes.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const cards: PricingCardState[] | null = useMemo(() => {
    if (!products) return null;
    return [...products]
      .sort((a, b) => {
        const rankA =
          planOrder.get(a.id as "pay_as_you_go" | "plus_plan" | "pro_plan") ??
          PRODUCT_SEQUENCE.length;
        const rankB =
          planOrder.get(b.id as "pay_as_you_go" | "plus_plan" | "pro_plan") ??
          PRODUCT_SEQUENCE.length;
        if (rankA === rankB) return a.name.localeCompare(b.name);
        return rankA - rankB;
      })
      .map((product) => ({
        product,
        isActive: activeProductIds.has(product.id) || product.scenario === "active",
        isScheduled: scheduledProductIds.has(product.id) || product.scenario === "scheduled",
      }));
  }, [products, activeProductIds, scheduledProductIds, planOrder]);

  const isBillingVariant = variant === "billing";
  return (
    <section className={cn(isBillingVariant ? "space-y-6" : "py-16")}>
      <div
        className={cn(
          isBillingVariant ? "space-y-4" : "container mx-auto flex max-w-6xl flex-col gap-10",
        )}
      >
        <div
          className={cn(
            isBillingVariant ? "space-y-2" : "mx-auto max-w-3xl text-center space-y-4",
          )}
        >
          <h2
            className={cn(
              "text-4xl font-semibold tracking-tight",
              isBillingVariant ? "text-left" : "sm:text-5xl",
            )}
          >
            {heading}
          </h2>
          <p
            className={cn(
              "text-muted-foreground",
              isBillingVariant ? "text-sm" : "text-base sm:text-lg",
            )}
          >
            {description}
          </p>
        </div>

        {isLoading || !cards ? (
          <div className={cn("grid gap-6 md:grid-cols-3 w-full")}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="border-border/40 bg-card/80 h-[460px]">
                <CardHeader className="space-y-1 pb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="space-y-1 pb-2 flex-1">
                  <Separator className="bg-border/60" />
                  {Array.from({ length: 4 }).map((__, line) => (
                    <div key={line} className="flex items-center gap-3 pt-1">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className={cn("grid gap-6 md:grid-cols-3 w-full")}>{cards.map(renderCard)}</div>
        )}
      </div>
    </section>
  );
}

export { Pricing as PricingSection };
