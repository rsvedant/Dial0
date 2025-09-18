"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { PhoneCall, Clock, Info, CheckCircle2, Building2, Hash, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

type ActivityItem = {
  id: string
  type: "call" | "waiting" | "update" | "completed"
  title: string
  description?: string
  issueId?: string
  company?: string
  time: string
  meta?: { opensAt?: string; timezone?: string }
}

export default function ActivityPage() {
  const router = useRouter()
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const issues = React.useMemo(() => {
    if (!convexIssues) return [] as any[]
    return convexIssues.map((doc) => ({
      id: doc._id,
      title: doc.title,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      messages: [],
      messageCount: doc.messageCount,
      lastMessage: doc.lastMessage,
    }))
  }, [convexIssues])
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const updates = React.useMemo<ActivityItem[]>(() => [
    {
      id: "1",
      type: "call",
      title: "Spoke to customer service representative Sarah",
      description: "Follow-up scheduled for 3:30 PM PT.",
      issueId: "ISS-1234",
      company: "Acme Corp",
      time: "Today, 1:15 PM",
    },
    {
      id: "2",
      type: "waiting",
      title: "Waiting for Globex customer service to open",
      description: "Their lines are closed right now. We'll try again when they open.",
      issueId: "ISS-2345",
      company: "Globex",
      time: "Today, 7:05 AM",
      meta: { opensAt: "9:00 AM ET", timezone: "ET" },
    },
    {
      id: "3",
      type: "update",
      title: "Initech requested additional documents",
      description: "We sent you a secure upload link via email.",
      issueId: "ISS-5678",
      company: "Initech",
      time: "Yesterday, 4:42 PM",
    },
    {
      id: "4",
      type: "completed",
      title: "Call-back requested",
      description: "Preferred window 10:00–12:00 in your time zone.",
      issueId: "ISS-9012",
      company: "Umbrella",
      time: "Yesterday, 9:18 AM",
    },
  ], [])

  const renderIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "call":
        return <PhoneCall className="h-5 w-5 text-sidebar-foreground" />
      case "waiting":
        return <Clock className="h-5 w-5 text-sidebar-foreground" />
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      default:
        return <Info className="h-5 w-5 text-sidebar-foreground" />
    }
  }

  const typeToBadge = (type: ActivityItem["type"]) => {
    switch (type) {
      case "call":
        return { label: "Call", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" }
      case "waiting":
        return { label: "Waiting", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" }
      case "completed":
        return { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" }
      default:
        return { label: "Update", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300" }
    }
  }

  return (
    <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header px-4 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large scale-150 lg:scale-100"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="font-semibold text-lg truncate max-w-[60%]">Logo</h1>
        <div className="w-12" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 h-screen
        transform ios-transition
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <IssuesSidebar
          issues={issues as any}
          selectedIssueId={null}
          onSelectIssue={(id) => {
            router.push(`/?issueId=${id}`)
          }}
          onGoHome={() => router.push("/")}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pt-20 lg:pt-6 pb-24 animate-fade-in-up">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">Your recent updates and status changes.</p>
        </div>

        <div className="divide-y rounded-xl border">
          {updates.map((u, index) => {
            const badge = typeToBadge(u.type)
            return (
              <button
                key={u.id}
                className="w-full text-left px-4 py-4 hover:bg-accent/10 transition-colors cursor-pointer"
                style={{ animationDelay: `${index * 0.04}s` }}
                onClick={() => {
                  if (u.issueId) {
                    router.push(`/?issueId=${encodeURIComponent(u.issueId)}`)
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {renderIcon(u.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium leading-tight line-clamp-2">{u.title}</div>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{u.time}</div>
                    {u.description ? (
                      <p className="text-sm text-muted-foreground mt-2">{u.description}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                      {u.company ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Building2 className="h-4 w-4" /> {u.company}</span>
                      ) : null}
                      {u.issueId ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Hash className="h-4 w-4" /> {u.issueId}</span>
                      ) : null}
                      {u.meta?.opensAt ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> Opens {u.meta.opensAt}{u.meta.timezone ? ` ${u.meta.timezone}` : ""}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}


