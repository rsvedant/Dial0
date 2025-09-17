"use client"

import type { Issue } from "@/app/page"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { X, MessageCircle, Clock, CheckCircle2, User, Settings, Home } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <div className="h-full bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-sidebar-foreground" />
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Issues</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 modern-hover">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCloseSidebar} className="lg:hidden modern-hover h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={onGoHome}
          variant="outline"
          className="w-full h-9 text-sm font-medium modern-hover animate-scale-in shadow-sm bg-transparent rounded-none"
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      {/* Issues list */}
      <ScrollArea className="flex-1">
        <div className="p-0 space-y-0">
          {issues.map((issue, index) => {
            const StatusIcon = statusConfig[issue.status].icon
            const isSelected = issue.id === selectedIssueId

            return (
              <div
                key={issue.id}
                className={cn(
                  "p-3 cursor-pointer transition-all duration-300 modern-hover border-b border-sidebar-border/30",
                  "hover:bg-sidebar-accent/5 animate-fade-in-up",
                  isSelected &&
                    "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary/20 shadow-sm",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => {
                  onSelectIssue(issue.id)
                  onCloseSidebar()
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <StatusIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <h3
                      className={cn(
                        "font-medium text-sm line-clamp-2 leading-tight",
                        isSelected ? "text-sidebar-primary-foreground" : "text-sidebar-foreground",
                      )}
                    >
                      {issue.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5 flex items-center gap-1 font-medium rounded-md",
                      statusConfig[issue.status].color,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[issue.status].label}
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span
                      className={cn(
                        "text-xs",
                        isSelected ? "text-sidebar-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {issue.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {issue.messages.length > 0 && (
                  <div className="flex items-start gap-2 mt-2">
                    <MessageCircle className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60" />
                    <p
                      className={cn(
                        "text-xs line-clamp-1 leading-relaxed flex-1",
                        isSelected ? "text-sidebar-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {issue.messages[issue.messages.length - 1].content}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="mt-auto border-t border-sidebar-border bg-sidebar/50">
        <Button
          variant="ghost"
          className="w-full justify-start h-12 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/10 modern-hover rounded-none border-b border-sidebar-border/30"
        >
          <Settings className="h-4 w-4 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  )
}
