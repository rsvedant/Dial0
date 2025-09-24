"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IssuesSidebar } from "@/components/issues-sidebar";
import { ChatInterface } from "@/components/chat-interface";
import { Homepage } from "@/components/homepage";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticate } from "@daveyplate/better-auth-ui";
import { AuthDebug } from "@/components/auth-debug";
import { SettingsBootstrap } from "@/components/settings-bootstrap";

export interface Issue {
  id: string
  title: string
  status: "open" | "in-progress" | "resolved"
  createdAt: Date
  messages: Message[]
}

export interface Message {
  id: string
  content: string
  sender: "user" | "system"
  timestamp: Date
}

export default function DashboardPage() {
  return (
    <>
      <AuthLoading>
        <DashboardSkeleton />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </>
  );
}

function DashboardContent() {
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined;
  const createIssueMutation = useMutation(api.orchestration.createIssue);
  const updateIssueStatusMutation = useMutation(api.orchestration.updateIssueStatus);
  const searchParams = useSearchParams();

  const knownContext = useMemo(() => ({
    user: {
      name: process.env.NEXT_PUBLIC_USER_NAME || undefined,
      phone: process.env.NEXT_PUBLIC_USER_PHONE || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      address: process.env.NEXT_PUBLIC_USER_ADDRESS || undefined,
      birthdate: process.env.NEXT_PUBLIC_USER_BIRTHDATE || undefined,
    },
    service: {
      name: process.env.NEXT_PUBLIC_SERVICE_NAME || undefined,
      phone: process.env.NEXT_PUBLIC_SERVICE_PHONE || undefined,
    },
  }), [])

  const issues: (Issue & { messageCount?: number; lastMessage?: string })[] = useMemo(() => {
    if (!convexIssues) return []
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
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId)

  useEffect(() => {
    const issueIdParam = searchParams.get("issueId")
    const menuParam = searchParams.get("menu")
    if (issueIdParam && issues.length > 0) {
      const exists = issues.some((i) => (i.id as any) === issueIdParam)
      if (exists) {
        setSelectedIssueId(issueIdParam)
      }
    }
    if (menuParam === "open") {
      setSidebarOpen(true)
    }
  }, [searchParams, issues])

  const issueStats = {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "open").length,
    inProgress: issues.filter((issue) => issue.status === "in-progress").length,
    resolved: issues.filter((issue) => issue.status === "resolved").length,
  }

  const handleSelectIssue = useCallback((id: string) => {
    setSelectedIssueId(id)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("issueId", id)
      window.history.replaceState({}, "", url.toString())
    } catch {}
  }, [])

  const createNewIssue = useCallback(async () => {
    const title = "New Issue"
    const res = await createIssueMutation({ title })
    const newId = res.id as unknown as string
    handleSelectIssue(newId)
    setSidebarOpen(false)
  }, [createIssueMutation, handleSelectIssue])

  const goHome = () => {
    setSelectedIssueId(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("issueId")
    window.history.replaceState({}, "", url.toString())
    setSidebarOpen(false)
  }

  const updateIssue = useCallback((updatedIssue: Issue) => {
    const current = issues.find(i => i.id === updatedIssue.id)
    if (updatedIssue.status && current && current.status !== updatedIssue.status) {
      updateIssueStatusMutation({ id: updatedIssue.id as any, status: updatedIssue.status })
    }
  }, [updateIssueStatusMutation, issues])

  return (
    <div className="flex h-screen bg-background ios-no-bounce overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 lg:h-screen
        transform ios-transition lg:transform-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <IssuesSidebar
          issues={issues}
          selectedIssueId={selectedIssueId}
          onSelectIssue={handleSelectIssue}
          onGoHome={goHome}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className={cn("flex-1 animate-fade-in-up overflow-hidden", selectedIssue ? "pt-16 lg:pt-0" : "pt-0 flex items-center justify-center") }>
          {selectedIssue ? (
            <ChatInterface
              issue={selectedIssue}
              onUpdateIssue={updateIssue}
              onOpenMenu={() => setSidebarOpen(true)}
              knownContext={knownContext}
            />
          ) : (
            <div className="pt-0">
              <Homepage onCreateIssue={createNewIssue} issueStats={issueStats} onOpenMenu={() => setSidebarOpen(true)} />
            </div>
          )}
        </div>
      </div>
      <AuthDebug />
      <SettingsBootstrap />
    </div>
  )
}

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/sign-in");
  }, [router]);
  return <DashboardSkeleton minimal note="Redirecting to sign in" />;
}

function DashboardSkeleton({ minimal = false, note }: { minimal?: boolean; note?: string }) {
  // Skeleton tailored to Homepage hero + stats grid + optional sidebar shell.
  return (
    <div className="flex h-screen bg-background">
      {!minimal && (
        <div className="hidden lg:flex w-64 flex-col border-r border-sidebar-border/50 bg-sidebar/95 backdrop-blur-xl">
          {/* Header + Logo + Close btn area */}
          <div className="px-4 py-3 border-b border-sidebar-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 flex items-center justify-center">
                <div className="h-10 w-40 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
            </div>
            {/* Home button */}
            <div className="w-full flex items-center gap-3 px-4 py-3 bg-sidebar-accent/20 rounded-xl min-h-[44px]">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
          {/* Issues list (scroll area mimic) */}
          <div className="flex-1 overflow-hidden">
            <div className="px-4 py-2 space-y-1 overflow-y-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-transparent bg-sidebar-accent/10 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 bg-muted rounded" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="h-3 w-28 bg-muted rounded" />
                        <div className="h-3 w-10 bg-muted rounded ml-auto" />
                      </div>
                      <div className="h-3 w-40 bg-muted/70 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom actions */}
            <div className="px-4 py-3 border-t border-sidebar-border/50 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent/10 rounded-xl min-h-[44px]">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
        </div>
      )}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {/* Mobile top bar placeholder */}
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm px-4 lg:hidden border-b border-border h-16">
          <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="text-center max-w-md w-full mt-10 lg:mt-0 animate-fade-in-up">
          <div className="mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="h-8 w-8 bg-primary/40 rounded animate-pulse" />
            </div>
            <div className="h-7 w-40 mx-auto bg-muted rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-56 mx-auto bg-muted rounded animate-pulse" />
              <div className="h-3 w-44 mx-auto bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-12 w-56 mx-auto mb-10 bg-primary/40 rounded-xl shadow animate-pulse" />
          <div className="grid grid-cols-2 gap-4 text-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 w-8 mx-auto bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {note && (
          <div className="absolute bottom-4 right-4 text-[11px] font-mono bg-background/85 backdrop-blur border rounded px-2 py-1">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
