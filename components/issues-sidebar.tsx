"use client"

import type { Issue } from "@/app/page"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { X, MessageCircle, Clock, CheckCircle2, User, Settings, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { IssueIcon } from "@/components/issue-icon"

interface IssuesSidebarProps {
  issues: Issue[]
  selectedIssueId: string | null
  onSelectIssue: (issueId: string) => void
  onGoHome: () => void
  onCloseSidebar: () => void
}

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
}: IssuesSidebarProps) {
  return (
    <div className="h-full ios-sidebar flex flex-col animate-slide-in-left ios-no-bounce">
      {/* iOS-style Header */}
      <div className="safe-top bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Issues</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-12 w-12 p-0 ios-button icon-only large">
                <User className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onCloseSidebar} className="lg:hidden ios-button icon-only large h-12 w-12 p-0">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          {/* iOS-style Home Button */}
          <button
            onClick={onGoHome}
            className="w-full flex items-center gap-3 px-4 py-3 bg-sidebar-accent/20 hover:bg-sidebar-accent/30 rounded-xl ios-transition ios-button min-h-[44px]"
          >
            <Home className="h-5 w-5 text-sidebar-foreground" />
            <span className="text-sm font-medium text-sidebar-foreground">Home</span>
          </button>
        </div>
      </div>

      {/* iOS-style Issues List */}
      <ScrollArea className="flex-1 ios-scroll">
        <div className="px-4 py-2">
          <div className="space-y-1">
            {issues.map((issue, index) => {
              const StatusIcon = statusConfig[issue.status].icon
              const isSelected = issue.id === selectedIssueId

              return (
                <div
                  key={issue.id}
                  className={cn(
                    "group relative ios-list-item p-3 cursor-pointer ios-transition ios-button",
                    "animate-fade-in-up",
                    isSelected && "bg-primary/10 border border-primary/20",
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    onSelectIssue(issue.id)
                    onCloseSidebar()
                  }}
                >
                  {/* iOS-style list item */}
                  <div className="flex items-start gap-3">
                    {/* Issue icon */}
                    <IssueIcon issueId={issue.id} size="sm" />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={cn(
                          "font-medium text-sm leading-tight line-clamp-2",
                          isSelected ? "text-primary" : "text-sidebar-foreground"
                        )}>
                          {issue.title}
                        </h3>
                        
                        {/* Status badge */}
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0",
                          issue.status === "open" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          issue.status === "in-progress" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                          issue.status === "resolved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        )}>
                          {statusConfig[issue.status].label}
                        </div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{issue.createdAt.toLocaleDateString()}</span>
                        {issue.messages.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{issue.messages.length} messages</span>
                          </>
                        )}
                      </div>
                      
                      {/* Last message preview */}
                      {issue.messages.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {issue.messages[issue.messages.length - 1].content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* iOS-style Bottom Section */}
      <div className="mt-auto safe-bottom bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border/50">
        <div className="px-4 py-3">
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent/10 rounded-xl ios-transition ios-button min-h-[44px]">
            <Settings className="h-5 w-5 text-sidebar-foreground" />
            <span className="text-sm font-medium text-sidebar-foreground">Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
