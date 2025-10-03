"use client"

import type { IssueListItem, IssueStatus } from "@/types/issue"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, MessageCircle, Clock, CheckCircle2, Settings, Shield, Home, Inbox, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { IssueIcon } from "@/components/issue-icon"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/logo"

interface IssuesSidebarProps {
  issues: IssueListItem[]
  selectedIssueId: string | null
  onSelectIssue: (issueId: string) => void
  onGoHome: () => void
  onCloseSidebar: () => void
  disableAnimation?: boolean
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
  disableAnimation,
}: IssuesSidebarProps) {
  const router = useRouter()
  return (
    <div className={`h-full ios-sidebar flex flex-col ios-no-bounce overflow-hidden ${disableAnimation ? '' : 'animate-slide-in-left'}`}>
      {/* iOS-style Header */}
      <div className="safe-top bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 flex items-center justify-center">
              <Logo width={160} height={40} className="max-w-full" />
            </div>
            <Button variant="ghost" size="sm" onClick={onCloseSidebar} className="lg:hidden ios-button icon-only large h-12 w-12 p-0 flex-shrink-0">
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* iOS-style Home Button */}
          <button
            onClick={onGoHome}
            className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 rounded-xl ios-transition ios-button min-h-[44px]"
          >
            <Home className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Home</span>
          </button>
        </div>
      </div>

      {/* iOS-style Issues List */}
  <ScrollArea className="flex-1 overflow-auto bg-background">
        <div className="px-4 py-2 bg-background">
          <div className="space-y-1">
            {issues.map((issue, index) => {
              const statusKey: IssueStatus = issue.status as IssueStatus
              const isSelected = issue.id === selectedIssueId
              const itemAnimationClass = disableAnimation ? '' : 'animate-fade-in-up'

              return (
                <div
                  key={issue.id}
                  className={cn(
                    "group relative ios-list-item p-3 cursor-pointer ios-transition ios-button",
                    itemAnimationClass,
                    isSelected && "bg-primary/10 border border-primary/20",
                  )}
                  style={disableAnimation ? undefined : { animationDelay: `${index * 0.05}s` }}
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
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium text-sm leading-tight line-clamp-2 flex-1 min-w-0",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {issue.title}
                        </h3>
                        
                        {/* Status badge */}
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap",
                          issue.status === "open" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          issue.status === "in-progress" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                          issue.status === "resolved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        )}>
                          {statusConfig[statusKey].label}
                        </div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap overflow-hidden">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{issue.createdAt.toLocaleDateString()}</span>
                        {(issue as any).messageCount ? (
                          <>
                            <span>•</span>
                            <span className="whitespace-nowrap">{(issue as any).messageCount} messages</span>
                          </>
                        ) : issue.messages && issue.messages.length > 0 ? (
                          <>
                            <span>•</span>
                            <span className="whitespace-nowrap">{issue.messages.length} messages</span>
                          </>
                        ) : null}
                      </div>
                      
                      {/* Last message preview */}
                      {(issue as any).lastMessage ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 overflow-hidden text-ellipsis">
                          {(issue as any).lastMessage}
                        </p>
                      ) : issue.messages && issue.messages.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 overflow-hidden text-ellipsis">
                          {issue.messages[issue.messages.length - 1]?.content || ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* iOS-style Bottom Section */}
      <div className="mt-auto safe-bottom bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="px-4 py-3">
          <button
            onClick={() => {
              router.push("/billing")
              onCloseSidebar()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px] mb-2"
          >
            <CreditCard className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Billing &amp; Usage</span>
          </button>
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
            onClick={() => {
              router.push("/account/settings")
              onCloseSidebar()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px] mb-2"
          >
            <Settings className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Settings</span>
          </button>
          <button
            onClick={() => {
              router.push("/account/security")
              onCloseSidebar()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl ios-transition ios-button min-h-[44px]"
          >
            <Shield className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Security</span>
          </button>
        </div>
      </div>
    </div>
  )
}
