"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAction } from "convex/react"
import { useCustomer } from "autumn-js/react"
import { api } from "@/convex/_generated/api"
import { Loader2, ExternalLink, CreditCard, TrendingUp } from 'lucide-react'
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

const ISSUE_FEATURE_ID = "issues"
const VOICE_FEATURE_ID = "voice_minutes"

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
  } catch {
    return null
  }
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
  let message = `${usage} ${unitLabel}`
  if (quota === Number.POSITIVE_INFINITY) {
    message += " • Unlimited"
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

export function BillingEmbed() {
  const { toast } = useToast()
  const router = useRouter()
  const [managing, setManaging] = useState(false)
  const { customer, isLoading, error } = useCustomer({
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <h3 className="text-base font-semibold text-destructive">Unable to load billing</h3>
          <p className="mt-2 text-sm text-destructive/80">
            We couldn't load your billing profile. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Billing & Usage</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and track usage across features.
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70 mb-1">Current plan</p>
              <CardTitle className="text-xl">{plan?.name ?? "Plus plan"}</CardTitle>
            </div>
            <CreditCard className="h-5 w-5 text-primary/60" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{statusLabel ?? "—"}</span>
          </div>
          {plan?.status === "trialing" && trialDays !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trial days left</span>
              <span className="font-medium">{trialDays}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Renewal</span>
            <span className="font-medium">{renewal ?? (plan ? "After trial" : "—")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment method</span>
            <span className={cn("font-medium", !hasPaymentMethod && "text-amber-600")}>
              {hasPaymentMethod ? "Card on file" : "Needs card"}
            </span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="secondary"
            onClick={handleBillingPortal}
            disabled={managing || isLoading}
            className="w-full"
            size="sm"
          >
            {managing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Redirecting…
              </>
            ) : (
              <>
                Manage billing
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Usage this cycle</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription className="text-xs">Track your feature consumption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Issues</span>
              <span className="font-medium">{issueUsage.message}</span>
            </div>
            <Progress value={issueUsage.percentage} className="h-2" />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Voice minutes</span>
              <span className="font-medium">{voiceUsage.message}</span>
            </div>
            <Progress value={voiceUsage.percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* View Full Page Button */}
      <Button
        variant="outline"
        onClick={() => {
          router.push("/billing")
        }}
        className="w-full"
      >
        View full billing page
      </Button>
    </div>
  )
}
