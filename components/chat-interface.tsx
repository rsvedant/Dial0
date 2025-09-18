"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Issue, Message } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Bot,
  User,
  Clock,
  CheckCircle2,
  MessageCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  Info,
  Sparkles,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useChat } from "@/hooks/use-chat"
import { TimelineIndicator } from "@/components/timeline-indicator"
import { IssueIcon } from "@/components/issue-icon"

interface ChatInterfaceProps {
  issue: Issue
  onUpdateIssue: (issue: Issue) => void
  onOpenMenu: () => void
}

interface ExtendedMessage extends Message {
  type?: "text" | "system" | "transcript" | "status" | "info"
  transcript?: { user: string; system: string }[]
  isExpanded?: boolean
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

const messageTypeConfig = {
  text: { icon: MessageCircle, bgClass: "bg-card", borderClass: "border-border" },
  system: { icon: Bot, bgClass: "bg-blue-50 dark:bg-blue-950/30", borderClass: "border-blue-200 dark:border-blue-800" },
  transcript: {
    icon: FileText,
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  status: {
    icon: CheckCircle,
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200 dark:border-green-800",
  },
  info: {
    icon: Info,
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    borderClass: "border-purple-200 dark:border-purple-800",
  },
}

export function ChatInterface({ issue, onUpdateIssue, onOpenMenu }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the intelligent chat hook
  const { messages: chatMessages, isLoading, isIssueComplete, sendMessage: sendChatMessage } = useChat({
    issueId: issue.id,
    onIssueComplete: (issueDetails) => {
      console.log('Issue complete:', issueDetails)
      // Update issue status to resolved when complete
      const updatedIssue = {
        ...issue,
        status: "resolved" as const,
        messages: [
          ...issue.messages,
          ...chatMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp
          }))
        ]
      }
      onUpdateIssue(updatedIssue)
    }
  })

  // Use only chat messages from Convex to avoid duplication with static issue.messages
  const enhancedMessages: ExtendedMessage[] = chatMessages.length === 0 ? [
    {
      id: "welcome",
      content: "Hi! I'm here to help you with your issue. Could you please describe what problem you're experiencing?",
      sender: "system" as const,
      timestamp: new Date(),
      type: "text" as const,
    }
  ] : chatMessages.map((msg) => ({ ...msg, type: msg.type || "text" as const }))

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [enhancedMessages])

  // Adjust for iOS keyboard to avoid layout jumps
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).visualViewport) return
    const vv = (window as any).visualViewport as VisualViewport
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height)
      document.documentElement.style.setProperty('--kb', kb + 'px')
    }
    onResize()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  const toggleTranscript = (messageId: string) => {
    setExpandedTranscripts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return

    const messageContent = newMessage
    setNewMessage("")
    
    // Send to intelligent chat system
    await sendChatMessage(messageContent)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const StatusIcon = statusConfig[issue.status].icon

  return (
    <div className="flex flex-col h-full bg-background ios-no-bounce">
      <div className="fixed top-0 right-0 left-0 lg:left-64 z-20 safe-area border-b border-border glass-effect animate-slide-down bg-background/95 backdrop-blur-sm ios-no-bounce s:mt-[-18]">
        <div className="px-4 h-18">
          {/* Top row - Issue info and icon */}
          <div className="flex items-center gap-3 justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMenu}
              className="lg:hidden h-20 ml-[-20] scale-150 p-0 ios-button icon-only large"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <IssueIcon issueId={issue.id} size="md" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground line-clamp-1 mb-1">{issue.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">#{issue.id}</span>
                <span>•</span>
                <span>{issue.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between w-full px-3 border-t border-border pt-3 h-8">
            <TimelineIndicator status={issue.status} issueType={issue.id} />
          </div>
      </div>
      

  <ScrollArea className="flex-1 p-4 pt-24 pb-0 overflow-auto" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {enhancedMessages.map((message, index) => {
            const isUser = message.sender === "user"
            const messageConfig = messageTypeConfig[message.type || "text"]
            const MessageIcon = messageConfig.icon
            const isExpanded = expandedTranscripts.has(message.id)

            return (
              <div
                key={message.id}
                className={cn("flex gap-3 animate-fade-in-up", isUser ? "justify-end" : "justify-start")}
                style={{ animationDelay: `${index * 0.05}s` }}
              >

                <div className={cn("max-w-[75%] transition-all duration-300", isUser && "ml-auto")}>
                  <div
                    className={cn(
                      "rounded-3xl px-6 py-4 transition-all duration-300",
                      isUser
                        ? "bg-primary text-primary-foreground liquid-glass-button"
                        : "liquid-glass-card text-card-foreground",
                    )}
                  >
                    {message.type === "transcript" ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{message.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTranscript(message.id)}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>

                        {isExpanded && message.transcript && (
                          <div className="mt-3 space-y-2 border-t border-amber-200 dark:border-amber-800 pt-3">
                            {message.transcript?.map((exchange, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-start gap-2">
                                  <User className="h-3 w-3 mt-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{exchange.user}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Bot className="h-3 w-3 mt-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{exchange.system}</p>
                                </div>
                                {idx < (message.transcript?.length || 0) - 1 && (
                                  <div className="h-px bg-amber-200 dark:bg-amber-800 my-2" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <p
                        className={cn(
                          "text-xs opacity-70 font-medium",
                          isUser ? "text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {message.type && message.type !== "text" && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 capitalize">
                          {message.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in-up">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm">
                <Bot className="h-4 w-4 text-primary-foreground animate-pulse" />
              </div>
              <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* iOS-style Input Area */}
      <div className="sticky bottom-0 z-20 safe-area border-t border-border glass-effect animate-fade-in-up bg-background/95 backdrop-blur-sm ios-no-bounce" style={{ paddingBottom: 'var(--kb, 0px)' }}>
        <div className="flex gap-3 max-w-4xl mx-auto p-4">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="h-12 text-sm px-4 pr-14 rounded-2xl border-border/50 focus:border-primary/50 ios-transition focus:scale-[1.01] shadow-sm bg-background/80 backdrop-blur-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="absolute right-2 top-2 h-8 w-8 p-0 rounded-xl modern-hover animate-scale-in shadow-sm ios-button icon-only"
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isLoading && (
          <div className="flex justify-center pb-3">
            <div className="text-xs text-muted-foreground animate-pulse bg-muted/50 px-3 py-1 rounded-full">
              AI is analyzing your message...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
