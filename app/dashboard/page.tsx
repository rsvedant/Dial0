"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { Homepage } from "@/components/homepage"
import { cn } from "@/lib/utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useSearchParams } from "next/navigation"

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
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const createIssueMutation = useMutation(api.orchestration.createIssue)
  const updateIssueStatusMutation = useMutation(api.orchestration.updateIssueStatus)
  const searchParams = useSearchParams()

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
    </div>
  )
}
