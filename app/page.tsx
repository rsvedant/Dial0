"use client"

import { useState } from "react"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { Homepage } from "@/components/homepage"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"

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

const mockIssues: Issue[] = [
  {
    id: "1",
    title: "Login page not loading",
    status: "open",
    createdAt: new Date("2024-01-15"),
    messages: [
      {
        id: "1",
        content: "The login page is not loading properly. I get a blank screen when I try to access it.",
        sender: "user",
        timestamp: new Date("2024-01-15T10:00:00"),
      },
      {
        id: "2",
        content:
          "I understand you're experiencing issues with the login page. Let me help you troubleshoot this. Can you tell me which browser you're using?",
        sender: "system",
        timestamp: new Date("2024-01-15T10:01:00"),
      },
    ],
  },
  {
    id: "2",
    title: "Payment processing error",
    status: "in-progress",
    createdAt: new Date("2024-01-14"),
    messages: [
      {
        id: "3",
        content: 'I\'m getting an error when trying to process payments. The error message says "Transaction failed".',
        sender: "user",
        timestamp: new Date("2024-01-14T14:30:00"),
      },
    ],
  },
  {
    id: "3",
    title: "Dashboard performance issues",
    status: "resolved",
    createdAt: new Date("2024-01-13"),
    messages: [
      {
        id: "4",
        content: "The dashboard is loading very slowly, especially the analytics section.",
        sender: "user",
        timestamp: new Date("2024-01-13T09:15:00"),
      },
    ],
  },
]

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>(mockIssues)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null) // Start with no issue selected to show homepage
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId)

  const issueStats = {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "open").length,
    inProgress: issues.filter((issue) => issue.status === "in-progress").length,
    resolved: issues.filter((issue) => issue.status === "resolved").length,
  }

  const createNewIssue = () => {
    const newIssue: Issue = {
      id: Date.now().toString(),
      title: "New Issue",
      status: "open",
      createdAt: new Date(),
      messages: [],
    }
    setIssues((prev) => [newIssue, ...prev])
    setSelectedIssueId(newIssue.id)
    setSidebarOpen(false)
  }

  const goHome = () => {
    setSelectedIssueId(null)
    setSidebarOpen(false)
  }

  const updateIssue = (updatedIssue: Issue) => {
    setIssues((prev) => prev.map((issue) => (issue.id === updatedIssue.id ? updatedIssue : issue)))
  }

  return (
    <div className="flex h-screen bg-background ios-no-bounce">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
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
      <div className="flex-1 flex flex-col min-w-0">
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
        <div className="flex-1 animate-fade-in-up pt-16 lg:pt-0 ios-scroll">
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
