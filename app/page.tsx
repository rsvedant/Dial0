"use client"

import { useCallback, useMemo, useState } from "react"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { Homepage } from "@/components/homepage"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

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

// No mock issues; source from Convex

export default function HomePage() {
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const createIssueMutation = useMutation(api.orchestration.createIssue)
  const updateIssueStatusMutation = useMutation(api.orchestration.updateIssueStatus)

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
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null) // Start with no issue selected to show homepage
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId)

  const issueStats = {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "open").length,
    inProgress: issues.filter((issue) => issue.status === "in-progress").length,
    resolved: issues.filter((issue) => issue.status === "resolved").length,
  }

  const createNewIssue = useCallback(async () => {
    const title = "New Issue"
    const res = await createIssueMutation({ title })
    setSelectedIssueId(res.id as unknown as string)
    setSidebarOpen(false)
  }, [createIssueMutation])

  const goHome = () => {
    setSelectedIssueId(null)
    setSidebarOpen(false)
  }

  const updateIssue = useCallback((updatedIssue: Issue) => {
    // Reflect status changes to Convex if resolved
    if (updatedIssue.status) {
      updateIssueStatusMutation({ id: updatedIssue.id as any, status: updatedIssue.status })
    }
  }, [updateIssueStatusMutation])

  return (
    <div className="flex h-screen bg-background ios-no-bounce overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
          onSelectIssue={setSelectedIssueId}
          onGoHome={goHome}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        {/* <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area border-b border-border bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="font-semibold text-lg">Issues</h1>
          <div className="w-12" /> 
        </div> */}

        {/* Content area */}
  <div className="flex-1 animate-fade-in-up pt-16 lg:pt-0 overflow-hidden">
          {selectedIssue ? (
            <ChatInterface issue={selectedIssue} onUpdateIssue={updateIssue} onOpenMenu={() => setSidebarOpen(true)} />
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
