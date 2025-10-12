"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  PhoneCall,
  Clock,
  Info,
  CheckCircle2,
  Hash,
  Menu,
  MessageCircle,
  FileText,
  AudioLines,
  Radio,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Logo } from "@/components/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow, parseISO, format } from "date-fns"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type ActivityFeedItem = {
  id: string
  createdAt: string
  source: "issue" | "chat" | "call" | "context"
  type: string
  issueId?: string
  issueTitle?: string
  callId?: string
  summary: string
  details?: string
  metadata?: Record<string, any>
}

type ActivityCursor = {
  id: string
  createdAt: string
}

type ActivityFeedResponse = {
  items: ActivityFeedItem[]
  nextCursor: ActivityCursor | null
  hasMore: boolean
}

function ActivitySkeleton() {
  return (
    <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm px-4 lg:hidden">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-32" />
        <div className="w-12" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-6 pt-20 lg:pt-6 pb-24">
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="divide-y rounded-xl border overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RedirectToSignIn() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/auth/sign-in?next=/activity")
  }, [router])
  return <ActivitySkeleton />
}

function ActivityContent() {
  const router = useRouter()
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const PAGE_SIZE = 40
  const [cursor, setCursor] = React.useState<ActivityCursor | null>(null)
  const activityResponse = useQuery(
    api.orchestration.listActivityFeed,
    cursor
      ? { limit: PAGE_SIZE, cursor }
      : { limit: PAGE_SIZE }
  ) as ActivityFeedResponse | undefined
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [loadedItems, setLoadedItems] = React.useState<ActivityFeedItem[]>([])
  const [nextCursor, setNextCursor] = React.useState<ActivityCursor | null>(null)
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const loadedItemsRef = React.useRef<ActivityFeedItem[]>([])
  const [pendingScroll, setPendingScroll] = React.useState<{ oldHeight: number; oldTop: number } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

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

  const renderIcon = React.useCallback((item: ActivityFeedItem) => {
    if (item.source === "call") {
      if (item.type === "call.lifecycle") {
        if (item.metadata?.status === "ended") return <CheckCircle2 className="h-5 w-5 text-green-500" />
        return <PhoneCall className="h-5 w-5 text-sidebar-foreground" />
      }
      if (item.type === "call.recording") return <AudioLines className="h-5 w-5 text-orange-500" />
      if (item.type === "call.monitor") return <Radio className="h-5 w-5 text-sky-500" />
      if (item.type === "call.transcript") return <FileText className="h-5 w-5 text-purple-500" />
      return <PhoneCall className="h-5 w-5 text-sidebar-foreground" />
    }
    if (item.source === "chat") {
      return <MessageCircle className="h-5 w-5 text-sidebar-foreground" />
    }
    if (item.source === "context") {
      return <Info className="h-5 w-5 text-sidebar-foreground" />
    }
    return <Info className="h-5 w-5 text-sidebar-foreground" />
  }, [])

  const badgeForItem = React.useCallback((item: ActivityFeedItem) => {
    if (item.source === "call") {
      if (item.type === "call.lifecycle" && item.metadata?.status === "ended") {
        return { label: "Call ended", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" }
      }
      if (item.type === "call.lifecycle") {
        return { label: "Call", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" }
      }
      if (item.type === "call.recording") {
        return { label: "Recording", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" }
      }
      return { label: "Call", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" }
    }
    if (item.source === "chat") {
      if (item.type === "chat.user") {
        return { label: "You", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300" }
      }
      if (item.type === "chat.assistant") {
        return { label: "Agent", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" }
      }
      return { label: "System", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300" }
    }
    if (item.source === "context") {
      return { label: "Context", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" }
    }
    return { label: "Issue", className: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" }
  }, [])

  const formatTime = React.useCallback((iso: string) => {
    try {
      const date = parseISO(iso)
      return `${formatDistanceToNow(date, { addSuffix: true })} • ${format(date, "MMM d, yyyy h:mm a")}`
    } catch {
      return iso
    }
  }, [])

  const loadMore = React.useCallback(() => {
    if (!hasMore) {
      setError("You're all caught up on activity.")
      return
    }
    if (loadingMore) return
    if (!nextCursor) {
      setError("Something went wrong fetching the next page of activity.")
      return
    }
    setError(null)
    setLoadingMore(true)
    setCursor(nextCursor)
  }, [hasMore, loadingMore, nextCursor])

  React.useEffect(() => {
    if (!activityResponse) return

    setHasMore(activityResponse.hasMore)
    setNextCursor(activityResponse.nextCursor)

    const previousItems = loadedItemsRef.current
    if (!cursor && previousItems.length > 0 && scrollContainerRef.current) {
      const node = scrollContainerRef.current
      setPendingScroll({ oldHeight: node.scrollHeight, oldTop: node.scrollTop })
    }

    setLoadedItems((prev) => {
      const map = new Map<string, ActivityFeedItem>()
      for (const item of prev) {
        map.set(item.id, item)
      }
      for (const item of activityResponse.items) {
        map.set(item.id, item)
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const maxItems = PAGE_SIZE * 5
      return merged.slice(0, maxItems)
    })

    setLoadingMore(false)
  }, [activityResponse, cursor, PAGE_SIZE])

  React.useEffect(() => {
    loadedItemsRef.current = loadedItems
  }, [loadedItems])

  React.useEffect(() => {
    if (!hasMore) return
    if (!loadMoreRef.current) return

    const node = loadMoreRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMoreRef, loadingMore, loadMore])

  React.useEffect(() => {
    if (!pendingScroll) return
    const node = scrollContainerRef.current
    if (!node) return

    const diff = node.scrollHeight - pendingScroll.oldHeight
    node.scrollTop = pendingScroll.oldTop + diff
    setPendingScroll(null)
  }, [loadedItems, pendingScroll])

  const isInitialLoading = !activityResponse && loadedItems.length === 0
  const emptyState = !isInitialLoading && loadedItems.length === 0

  const handleClickItem = React.useCallback((item: ActivityFeedItem) => {
    if (item.issueId) {
      router.push(`/dashboard?issueId=${encodeURIComponent(item.issueId)}`)
      return
    }
  }, [router])

  return (
    <div
      className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64"
      ref={scrollContainerRef}
    >
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
        <Logo width={120} height={30} />
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
            router.push(`/dashboard?issueId=${id}`)
          }}
          onGoHome={() => router.push("/dashboard")}
          onCloseSidebar={() => setSidebarOpen(false)}
          disableAnimation
        />
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pt-20 lg:pt-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">Your recent updates and status changes.</p>
        </motion.div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Activity issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border overflow-hidden">
          {isInitialLoading ? (
            <ActivitySkeletonList />
          ) : emptyState ? (
            <EmptyActivityState />
          ) : (
            <div className="divide-y">
              {loadedItems.map((item, index) => {
                const badge = badgeForItem(item)
                const highlight = item.metadata?.status === "ended" || item.type === "call.recording"
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.03 * index, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "w-full text-left px-4 py-4 transition-colors cursor-pointer focus:outline-none",
                      highlight ? "bg-green-50/30 dark:bg-green-900/10 hover:bg-green-100/40" : "hover:bg-accent/10"
                    )}
                    onClick={() => handleClickItem(item)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {renderIcon(item)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium leading-tight text-left line-clamp-2">
                              {item.summary}
                            </div>
                            {item.issueTitle ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                Linked to: {item.issueTitle}
                              </div>
                            ) : null}
                          </div>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTime(item.createdAt)}
                        </div>
                        {item.details ? (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                            {item.details}
                          </p>
                        ) : null}
                        <MetadataChips item={item} />
                        <ActivityActions item={item} onError={setError} />
                      </div>
                    </div>
                  </motion.button>
                )
              })}
              <div className="px-4 py-4 flex flex-col items-center gap-3" ref={loadMoreRef}>
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more activity…
                  </div>
                ) : hasMore ? (
                  <Button variant="outline" size="sm" onClick={loadMore}>
                    Load more
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    You're all caught up.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivitySkeletonList() {
  return (
    <div className="divide-y">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyActivityState() {
  return (
    <div className="px-6 py-16 text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Info className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">No activity yet</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Once you create an issue or place calls, you&apos;ll see live updates, transcripts, and summaries here.
      </p>
    </div>
  )
}

function MetadataChips({ item }: { item: ActivityFeedItem }) {
  const chips: { icon: React.ReactNode; label: string }[] = []

  if (item.issueId) {
    chips.push({
      icon: <Hash className="h-4 w-4" />,
      label: item.issueId,
    })
  }

  if (item.callId) {
    chips.push({
      icon: <PhoneCall className="h-4 w-4" />,
      label: `Call ${item.callId}`,
    })
  }

  if (item.metadata?.status && item.type.startsWith("call")) {
    chips.push({
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: item.metadata.status,
    })
  }

  if (typeof item.metadata?.durationSec === "number") {
    const minutes = Math.max(1, Math.round(item.metadata.durationSec / 60))
    chips.push({
      icon: <Clock className="h-4 w-4" />,
      label: `${minutes} min call`,
    })
  }

  if (item.metadata?.recordingUrl) {
    chips.push({
      icon: <AudioLines className="h-4 w-4" />,
      label: "Recording available",
    })
  }

  if (item.metadata?.monitorListenUrl || item.metadata?.monitorControlUrl) {
    chips.push({
      icon: <Radio className="h-4 w-4" />,
      label: "Live monitor",
    })
  }

  if (item.metadata?.source && item.source === "context") {
    chips.push({
      icon: <Info className="h-4 w-4" />,
      label: `Source: ${item.metadata.source}`,
    })
  }

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-3">
      {chips.map((chip, idx) => (
        <span
          key={`${idx}-${chip.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-1"
        >
          {chip.icon}
          {chip.label}
        </span>
      ))}
    </div>
  )
}

function ActivityActions({
  item,
  onError,
}: {
  item: ActivityFeedItem
  onError: (message: string | null) => void
}) {
  const recordingUrl = item.metadata?.recordingUrl
  const monitorListenUrl = item.metadata?.monitorListenUrl
  const monitorControlUrl = item.metadata?.monitorControlUrl

  if (!recordingUrl && !monitorListenUrl && !monitorControlUrl) {
    return null
  }

  const validateUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === "https:" || parsed.protocol === "http:"
    } catch {
      return false
    }
  }

  const handleNavigate = (url: string, label: string) => {
    if (!validateUrl(url)) {
      onError(`The ${label} link is unavailable or invalid.`)
      return
    }
    onError(null)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {recordingUrl ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleNavigate(recordingUrl, "recording")}
        >
          Listen to recording
        </Button>
      ) : null}
      {monitorListenUrl ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleNavigate(monitorListenUrl, "monitor listen")}
        >
          Monitor (listen)
        </Button>
      ) : null}
      {monitorControlUrl ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleNavigate(monitorControlUrl, "monitor control")}
        >
          Monitor (control)
        </Button>
      ) : null}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <>
      <AuthLoading>
        <ActivitySkeleton />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>
        <ActivityContent />
      </Authenticated>
    </>
  )
}