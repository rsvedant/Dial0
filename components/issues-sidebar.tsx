"use client"

import type { IssueListItem, IssueStatus } from "@/types/issue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, MessageCircle, Clock, CheckCircle2, Settings, Shield, Home, Inbox, CreditCard, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { IssueIcon } from "@/components/issue-icon"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/logo"
import { SettingsModal } from "@/components/settings-modal"
import { useState } from "react"

// Helper function to get relative time
const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInMinutes < 1) {
    return "now"
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  } else if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`
  } else {
    return `${diffInYears}y ago`
  }
}

interface IssuesSidebarProps {
  issues: IssueListItem[]
  selectedIssueId: string | null
  onSelectIssue: (issueId: string) => void
  onGoHome: () => void
  onCloseSidebar: () => void
  onCreateIssue: () => void
  disableAnimation?: boolean
}

// Demo issues for showcase
const DEMO_ISSUES: IssueListItem[] = [
  {
    id: "demo-needs-info",
    title: "Internet Outage - Technician Visit",
    status: "in-progress",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    messageCount: 8,
    lastMessage: "Additional information required for scheduling"
  },
  {
    id: "demo-resolved",
    title: "AC Not Working - Service Scheduled",
    status: "resolved",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    messageCount: 12,
    lastMessage: "Appointment confirmed for Tuesday, Oct 15 @ 2:00 PM"
  },
  {
    id: "demo-email-sent",
    title: "Billing Dispute - Weekend Hours",
    status: "open",
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    messageCount: 3,
    lastMessage: "Email sent to billing support, response expected Mon-Tue"
  }
]

const statusConfig = {
  open: {
    icon: MessageCircle,
    color: "bg-background text-foreground border-border",
    label: "Open",
  },
  "in-progress": {
    icon: Clock,
    color: "bg-muted text-muted-foreground border-border",
    label: "In Progress",
  },
  resolved: {
    icon: CheckCircle2,
    color: "bg-primary text-primary-foreground border-primary",
    label: "Resolved",
  },
}

export function IssuesSidebar({
  issues,
  selectedIssueId,
  onSelectIssue,
  onGoHome,
  onCloseSidebar,
  onCreateIssue,
  disableAnimation,
}: IssuesSidebarProps) {
  const router = useRouter()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  
  return (
    <div className={`h-full ios-sidebar flex flex-col ios-no-bounce overflow-hidden ${disableAnimation ? '' : 'animate-slide-in-left'}`}>
      {/* iOS-style Header */}
      <div className="safe-top bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 flex items-center justify-center">
              <Logo width={120}className="max-w-full" />
            </div>
            <Button variant="ghost" size="sm" onClick={onCloseSidebar} className="lg:hidden ios-button icon-only large h-12 w-12 p-0 flex-shrink-0">
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Home Button */}
          <button
            onClick={onGoHome}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px] mb-2"
          >
            <Home className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Home</span>
          </button>
          
          {/* Create New Issue Button */}
          <button
            onClick={() => {
              onCreateIssue()
              onCloseSidebar()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px]"
          >
            <Plus className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Create New Issue</span>
          </button>
        </div>
      </div>

      {/* Issues List */}
  <ScrollArea className="flex-1 overflow-auto bg-background">
        <div className="bg-background">
          {/* User Issues Section */}
          {issues.length > 0 && (
            <div>
              {issues.map((issue, index) => {
              const statusKey: IssueStatus = issue.status as IssueStatus
              const isSelected = issue.id === selectedIssueId
              const itemAnimationClass = disableAnimation ? '' : 'animate-fade-in-up'

              return (
                <div
                  key={issue.id}
                  className={cn(
                    "group relative px-4 py-3 cursor-pointer ios-transition ios-button border-b border-border/30",
                    itemAnimationClass,
                    isSelected && "bg-primary/5",
                  )}
                  style={disableAnimation ? undefined : { animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    onSelectIssue(issue.id)
                    onCloseSidebar()
                  }}
                >
                  {/* Simplified list item */}
                  <div className="flex items-start gap-3">
                    {/* Issue icon */}
                    <IssueIcon issueId={issue.id} size="sm" />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium text-sm leading-tight line-clamp-2 flex-1 min-w-0",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {issue.title}
                        </h3>
                        
                        {/* Simplified status indicator */}
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                          issue.status === "open" && "bg-blue-500",
                          issue.status === "in-progress" && "bg-orange-500",
                          issue.status === "resolved" && "bg-green-500"
                        )}>
                        </div>
                      </div>
                      
                      {/* Simplified metadata */}
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(issue.createdAt)}
                        {(issue as any).messageCount ? (
                          <span> • {(issue as any).messageCount} messages</span>
                        ) : issue.messages && issue.messages.length > 0 ? (
                          <span> • {issue.messages.length} messages</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )}
          
          {/* Demo Issues Section - at the end */}
          <div>
            {DEMO_ISSUES.map((issue, index) => {
              const statusKey: IssueStatus = issue.status as IssueStatus
              const isSelected = issue.id === selectedIssueId
              const itemAnimationClass = disableAnimation ? '' : 'animate-fade-in-up'
              const adjustedIndex = issues.length + index // Adjust animation delay based on actual issues

              return (
                <div
                  key={issue.id}
                  className={cn(
                    "group relative px-4 py-3 cursor-pointer ios-transition ios-button border-b border-border/30",
                    itemAnimationClass,
                    isSelected && "bg-primary/5",
                  )}
                  style={disableAnimation ? undefined : { animationDelay: `${adjustedIndex * 0.05}s` }}
                  onClick={() => {
                    onSelectIssue(issue.id)
                    onCloseSidebar()
                  }}
                >
                  {/* Simplified list item */}
                  <div className="flex items-start gap-3">
                    {/* Issue icon */}
                    <IssueIcon issueId={issue.id} size="sm" />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium text-sm leading-tight line-clamp-2 flex-1 min-w-0",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {issue.title}
                        </h3>
                        
                        {/* Simplified status indicator */}
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                          issue.status === "open" && "bg-blue-500",
                          issue.status === "in-progress" && "bg-orange-500",
                          issue.status === "resolved" && "bg-green-500"
                        )}>
                        </div>
                      </div>
                      
                      {/* Simplified metadata */}
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(issue.createdAt)}
                        {issue.messageCount && (
                          <span> • {issue.messageCount} messages</span>
                        )}
                      </div>
                      
                      {/* Summary for demo issues */}
                      {issue.lastMessage && (
                        <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
                          {issue.lastMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Mock data disclaimer */}
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground/60">
              Mock data for demonstration • Real interface coming soon
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="mt-auto safe-bottom bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="px-4 py-3">
          <button
            onClick={() => {
              router.push("/activity")
              onCloseSidebar()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px] mb-2"
          >
            <Inbox className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Activity</span>
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px]"
          >
            <User className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Profile</span>
          </button>
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  )
}
