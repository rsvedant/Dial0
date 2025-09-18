"use client"

import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, Clock, CheckCircle2, Menu } from "lucide-react"

interface HomepageProps {
  onCreateIssue: () => void
  issueStats: {
    total: number
    open: number
    inProgress: number
    resolved: number
  }
  onOpenMenu: () => void
}

export function Homepage({ onCreateIssue, issueStats, onOpenMenu }: HomepageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-background relative">
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header px-4 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMenu}
          className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large scale-150 lg:scale-100"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="font-semibold text-lg">Logo</h1>
        <div className="w-12" />
      </div>
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-scale-in">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Issue Tracker</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create and manage your issues with our intelligent chat interface
          </p>
        </div>

        <Button
          onClick={onCreateIssue}
          className="h-12 px-8 text-base font-medium mb-8 animate-scale-in shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Issue
        </Button>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div
            className="p-4 rounded-xl bg-card border border-border animate-fade-in-up hover:shadow-sm transition-all duration-300"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Open</span>
            </div>
            <p className="text-xl font-bold text-foreground">{issueStats.open}</p>
          </div>
          <div
            className="p-4 rounded-xl bg-card border border-border animate-fade-in-up hover:shadow-sm transition-all duration-300"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">In Progress</span>
            </div>
            <p className="text-xl font-bold text-foreground">{issueStats.inProgress}</p>
          </div>
          <div
            className="p-4 rounded-xl bg-card border border-border animate-fade-in-up hover:shadow-sm transition-all duration-300"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Resolved</span>
            </div>
            <p className="text-xl font-bold text-foreground">{issueStats.resolved}</p>
          </div>
          <div
            className="p-4 rounded-xl bg-card border border-border animate-fade-in-up hover:shadow-sm transition-all duration-300"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Total</span>
            </div>
            <p className="text-xl font-bold text-foreground">{issueStats.total}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
