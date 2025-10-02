"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type Tier = {
  id: string
  name: string
  price: string
  interval?: string
  badge?: string
  description: string
  features: string[]
  cta: string
  featured?: boolean
}

const tiers: Tier[] = [
  {
    id: "plus_plan",
    name: "Plus Plan",
    price: "$49",
    interval: "per month",
    description: "Two-week free trial with core automations and guided onboarding.",
    features: [
      "Includes 50 managed issues every month",
      "50 voice minutes with live agent escalations",
      "Overage: $0.75 per extra issue",
      "Overage: $0.25 per extra voice minute",
      "Autumn usage dashboards and live transcripts",
    ],
    cta: "Start free",
  },
  {
    id: "pro_plan",
    name: "Pro Plan",
    price: "$199",
    interval: "per month",
    badge: "Most popular",
    description: "Expanded limits, live voice escalation, and advanced routing controls.",
    features: [
      "Includes 200 managed issues each billing cycle",
      "300 voice minutes pooled across your pod",
      "Prepaid routing with supervisor overrides",
      "Overage: $0.50 per additional issue",
      "Overage: $0.20 per additional voice minute",
    ],
    cta: "Launch DialZero",
    featured: true,
  },
  {
    id: "pay_as_you_go",
    name: "Pay-As-You-Go",
    price: "Usage-based",
    interval: "per escalation",
    description: "Usage-based billing with enterprise-grade support SLAs.",
    features: [
      "$1.50 per issue resolved end-to-end",
      "$0.35 per voice minute with real-time routing",
      "Dedicated 24/7 advocate pool mapped to your playbooks",
      "Custom integrations, audit logs, and security reviews",
    ],
    cta: "Request pilot",
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full border-t border-b border-[rgba(55,50,47,0.12)] bg-[#F8F6F3] py-16 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:px-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(55,50,47,0.18)] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#37322F]">
            DialZero Pricing
          </span>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#2F2A27] sm:text-4xl md:text-5xl">
            Resolve the call, not the chaos
          </h2>
          <p className="max-w-2xl text-sm text-[#605A57] sm:text-base">
            These plans mirror what you'll see inside DialZero's billing dashboard. Pick a tier today and upgrade as more teams rely on your AI advocate.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const isFeatured = Boolean(tier.featured)
            return (
              <div
                key={tier.id}
                className={cn(
                  "flex h-full flex-col justify-between rounded-3xl border p-8 transition duration-200",
                  isFeatured
                    ? "border-transparent bg-gradient-to-br from-[#312926] via-[#2B2623] to-[#1F1A18] text-[#F8F6F3] shadow-[0_24px_60px_rgba(47,42,39,0.35)]"
                    : "border-[rgba(55,50,47,0.14)] bg-white shadow-[0_18px_36px_rgba(47,42,39,0.08)]"
                )}
              >
                <div className="flex flex-col gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className={cn("text-xl font-semibold tracking-tight", isFeatured ? "text-[#FDFBF2]" : "text-[#2F2A27]")}>{tier.name}</h3>
                        <p className={cn("mt-2 text-sm", isFeatured ? "text-[#E8E0D8]" : "text-[#605A57]")}>{tier.description}</p>
                      </div>
                      {tier.badge ? (
                        <span className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          isFeatured ? "bg-white/10 text-white" : "bg-[#F0EEEB] text-[#37322F]"
                        )}>
                          {tier.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-4xl font-semibold tracking-tight", isFeatured ? "text-white" : "text-[#2F2A27]")}>{tier.price}</span>
                      {tier.interval ? (
                        <span className={cn("text-sm", isFeatured ? "text-[#E8E0D8]" : "text-[#72685F]")}>{tier.interval}</span>
                      ) : null}
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 text-sm">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 leading-6">
                        <span
                          className={cn(
                            "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                            isFeatured ? "bg-white/15 text-white" : "bg-[#F0EEEB] text-[#37322F]"
                          )}
                        >
                          ✓
                        </span>
                        <span className={cn(isFeatured ? "text-[#F8F6F3]" : "text-[#534A43]")}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/dashboard"
                  className={cn(
                    "mt-10 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors",
                    isFeatured
                      ? "bg-[#F8F6F3] text-[#2F2A27] hover:bg-[#EDE7E3]"
                      : "bg-[#2F2A27] text-white hover:bg-[#1f1a18]"
                  )}
                >
                  {tier.cta}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
