"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Authenticated, AuthLoading, Unauthenticated, useAction } from "convex/react"
import { useCustomer } from "autumn-js/react"
import { api } from "@/convex/_generated/api"
import { Loader2, ExternalLink } from 'lucide-react'
import { cn } from "@/lib/utils"

import { Pricing } from "@/components/pricing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

const ISSUE_FEATURE_ID = "issues"
const VOICE_FEATURE_ID = "voice_minutes"
const PLAN_SUMMARY_COPY: Record<string, string> = {
  plus_plan: "Default plan with a 2-week included trial for new customers.",
  pro_plan: "Pro unlocks higher limits, live voice escalation, and faster incident routing.",
  pay_as_you_go: "Usage-based billing with unlimited issue throughput and enterprise response SLAs.",
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) return null
  try {
    const ms = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
    const date = new Date(ms)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (error) {
    console.warn("[billing] Failed to format date", { timestamp, error })
    return null
  }
}

function BillingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <div className="max-w-lg space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(320px,1fr)] xl:gap-12 items-start">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[460px] w-full" />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
              <CardHeader className="space-y-3 pb-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="pt-0">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>

            <Card className="rounded-xl border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function RedirectToSignIn() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/auth/sign-in?next=/billing")
  }, [router])
  return <BillingSkeleton />
}

type UsageSummaryOptions = {
  singular: string
  plural: string
  emptyMessage: string
}

const DEFAULT_USAGE_COPY: UsageSummaryOptions = {
  singular: "issue",
  plural: "issues",
  emptyMessage: "Usage tracked once you start creating issues.",
}

function usageSummary(feature: any, options: UsageSummaryOptions = DEFAULT_USAGE_COPY) {
  if (!feature) {
    return {
      usage: 0,
      quota: 0,
      percentage: 0,
      message: options.emptyMessage,
    }
  }

  const usage = feature.usage ?? 0
  const included = feature.included_usage ?? feature.usage_limit ?? 0
  const unlimited = feature.unlimited ?? false
  const quota = unlimited ? Number.POSITIVE_INFINITY : included
  const denominator = quota && quota !== Number.POSITIVE_INFINITY ? quota : usage > 0 ? usage : 1
  const percentage = Math.min(100, Math.round((usage / denominator) * 100))

  const { singular, plural } = options
  const unitLabel = usage === 1 ? singular : plural
  let message = `Tracked ${usage} ${unitLabel}`
  if (quota === Number.POSITIVE_INFINITY) {
    message += " • Pay-as-you-go pricing"
  } else if (quota > 0) {
    message += ` of ${quota} included`
  }

  return { usage, quota, percentage, message }
}

function currentPlan(customer: ReturnType<typeof useCustomer>["customer"]) {
  if (!customer || !customer.products?.length) return null
  const active = customer.products.find((product) => product.status === "active")
  if (active) return active
  const trialing = customer.products.find((product) => product.status === "trialing")
  if (trialing) return trialing
  return customer.products[0]
}

function nextRenewalAt(product: ReturnType<typeof currentPlan>) {
  if (!product?.current_period_end) return null
  return formatDate(product.current_period_end)
}

function trialDaysLeft(product: ReturnType<typeof currentPlan>) {
  if (!product) return null
  const now = Date.now()
  const trialEpoch =
    product.status === "trialing" && product.current_period_end
      ? product.current_period_end
      : product.trial_ends_at
  if (!trialEpoch) return null
  const endMs = trialEpoch > 1_000_000_000_000 ? trialEpoch : trialEpoch * 1000
  const diff = Math.max(0, endMs - now)
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

function BillingContent() {
  const { toast } = useToast()
  const [managing, setManaging] = useState(false)
  const { customer, isLoading, error, refetch } = useCustomer({
    errorOnNotFound: false,
  })
  const openBillingPortal = useAction(api.actions.autumn.openBillingPortal)

  const plan = useMemo(() => currentPlan(customer), [customer])
  const issuesFeature = customer?.features?.[ISSUE_FEATURE_ID]
  const voiceFeature = customer?.features?.[VOICE_FEATURE_ID]
  const issueUsage = useMemo(() => usageSummary(issuesFeature), [issuesFeature])
  const voiceUsage = useMemo(
    () =>
      usageSummary(voiceFeature, {
        singular: "voice minute",
        plural: "voice minutes",
        emptyMessage: "Voice usage appears once calls are completed.",
      }),
    [voiceFeature],
  )
  const renewal = useMemo(() => nextRenewalAt(plan), [plan])
  const trialDays = useMemo(() => trialDaysLeft(plan), [plan])
  const hasPaymentMethod = Boolean(customer?.payment_method)
  const statusLabel = plan?.status?.replace(/_/g, " ") ?? null
  const trialEndDate = useMemo(() => {
    if (!plan) return null
    const epoch =
      plan.status === "trialing" && plan.current_period_end
        ? plan.current_period_end
        : plan.trial_ends_at
    return epoch ? formatDate(epoch) : null
  }, [plan])
  const planCopy = plan?.id ? (PLAN_SUMMARY_COPY[plan.id] ?? PLAN_SUMMARY_COPY.plus_plan) : PLAN_SUMMARY_COPY.plus_plan

  const handleBillingPortal = async () => {
    setManaging(true)
    try {
      const result = await openBillingPortal({ returnPath: "/billing" })
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Could not open billing portal",
          description: result.error.message ?? "Stripe returned an unexpected error.",
        })
        return
      }
      const url = result?.data?.url ?? (result as any)?.url
      if (url) {
        window.location.assign(url)
        return
      }
      toast({
        title: "Portal unavailable",
        description: "We couldn't locate a Stripe portal for this account yet.",
      })
    } catch (portalError) {
      console.error("[billing] Failed to open portal", portalError)
      toast({
        variant: "destructive",
        title: "Billing unavailable",
        description: portalError instanceof Error ? portalError.message : "Unexpected error opening billing portal.",
      })
    } finally {
      setManaging(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive">Billing is cooling off</h2>
          <p className="mt-2 text-sm text-destructive/80">
            We couldn&apos;t load your billing profile. Refresh the page or contact support if the issue persists.
          </p>
          <Button
            className="mt-4 bg-transparent"
            variant="outline"
            onClick={() => {
              refetch()
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Billing & plans</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            DialZero automatically tracks metered issue usage. Upgrade whenever you need more volume or additional
            channels.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(320px,1fr)] xl:gap-12 items-start">
          <div className="space-y-6">
            <Pricing
              heading="Straightforward, usage-aware pricing"
              description="Plans scale with how many issues your automation pipeline resolves each month."
              variant="billing"
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <Card className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary/70">Current plan</p>
                    <h3 className="text-xl font-semibold leading-tight">{plan?.name ?? "Plus plan"}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{planCopy}</p>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{statusLabel ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Days left</span>
                  <span className="font-medium">
                    {plan?.status === "trialing" ? (trialDays ?? "—") : "—"}
                  </span>
                </div>
                {plan?.status === "trialing" && trialEndDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trial ends</span>
                    <span className="font-medium">{trialEndDate}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Renewal</span>
                  <span className="font-medium">{renewal ?? (plan ? "After trial" : "—")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment method</span>
                  <span className={cn("font-medium", !hasPaymentMethod && "text-amber-600")}>{hasPaymentMethod ? "Card on file" : "Needs card"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Issues this cycle</span>
                  <span className="font-medium">
                    {issueUsage.usage}
                    {issueUsage.quota && issueUsage.quota !== Number.POSITIVE_INFINITY ? ` / ${issueUsage.quota}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Voice minutes tracked</span>
                  <span className="font-medium">
                    {voiceUsage.usage}
                    {voiceUsage.quota && voiceUsage.quota !== Number.POSITIVE_INFINITY ? ` / ${voiceUsage.quota}` : voiceUsage.quota === Number.POSITIVE_INFINITY ? " • unlimited" : ""}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-0">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Need to update receipts or ownership? Manage everything in the billing portal.
                </div>
                <Button
                  variant="secondary"
                  onClick={handleBillingPortal}
                  disabled={managing || isLoading}
                  className="w-full"
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

            <Card className="rounded-xl border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Usage this cycle</CardTitle>
                <CardDescription className="text-sm">Stay ahead of limits and overages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Issues tracked</span>
                    <span>
                      {issueUsage.usage}
                      {issueUsage.quota && issueUsage.quota !== Number.POSITIVE_INFINITY
                        ? ` / ${issueUsage.quota}`
                        : issueUsage.quota === Number.POSITIVE_INFINITY
                          ? " • unlimited"
                          : ""}
                    </span>
                  </div>
                  <Progress value={issueUsage.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{issueUsage.message}</p>
                </div>
                <Separator className="bg-border/60" />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Voice minutes</span>
                    <span>
                      {voiceUsage.usage}
                      {voiceUsage.quota && voiceUsage.quota !== Number.POSITIVE_INFINITY
                        ? ` / ${voiceUsage.quota}`
                        : voiceUsage.quota === Number.POSITIVE_INFINITY
                          ? " • unlimited"
                          : ""}
                    </span>
                  </div>
                  <Progress value={voiceUsage.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{voiceUsage.message}</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
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
  )
}
