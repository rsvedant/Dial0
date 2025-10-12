"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Issue, Message } from "@/app/dashboard/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Radio,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCallAudio } from "@/hooks/use-call-audio"
import { MarkdownContent } from "@/components/chat/markdown-content"
import type { ChatMessage } from "@/hooks/use-chat"
import { useChat } from "@/hooks/use-chat"
import { TimelineIndicator } from "@/components/timeline-indicator"
import { IssueIcon } from "@/components/issue-icon"
import { LiveCallTranscript } from "@/components/chat/live-call-transcript"
import { ToolActivityBubble } from "@/components/chat/tool-activity-bubble"

interface ChatInterfaceProps {
  issue: Issue
  onUpdateIssue: (issue: Issue) => void
  onOpenMenu: () => void
  knownContext?: any
}

interface ExtendedMessage {
  id: string
  content: string
  sender: 'user' | 'system'
  timestamp: Date
  type?: "text" | "system" | "transcript" | "status" | "info" | "data-summary" | "data-operation" | "data-component" | "data-artifact" | "tool-activity"
  transcript?: { user: string; system: string }[]
  isExpanded?: boolean
  data?: any
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
    result?: unknown
    error?: string
    timestamp: Date
  }>
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
    icon: Radio,
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    borderClass: "border-purple-200 dark:border-purple-800",
  },
  status: { icon: Info, bgClass: "bg-yellow-50 dark:bg-yellow-950/30", borderClass: "border-yellow-200 dark:border-yellow-800" },
  info: { icon: CheckCircle, bgClass: "bg-green-50 dark:bg-green-950/30", borderClass: "border-green-200 dark:border-green-800" },
  'data-summary': { icon: Sparkles, bgClass: "bg-cyan-50 dark:bg-cyan-950/30", borderClass: "border-cyan-200 dark:border-cyan-800" },
  'data-operation': { icon: Info, bgClass: "bg-gray-50 dark:bg-gray-950/30", borderClass: "border-gray-200 dark:border-gray-800" },
  'data-component': { icon: FileText, bgClass: "bg-indigo-50 dark:bg-indigo-950/30", borderClass: "border-indigo-200 dark:border-indigo-800" },
  'data-artifact': { icon: FileText, bgClass: "bg-emerald-50 dark:bg-emerald-950/30", borderClass: "border-emerald-200 dark:border-emerald-800" },
  'tool-activity': { icon: Sparkles, bgClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-800" },
}

// Agent helper functions
function getAgentIcon(agent: string): string {
  const icons: Record<string, string> = {
    router: '🎯',
    financial: '💰',
    insurance: '🛡️',
    booking: '📅',
    account: '👤',
    support: '🎧',
  }
  return icons[agent] || '🤖'
}

function getAgentDisplayName(agent: string): string {
  const names: Record<string, string> = {
    router: 'Router',
    financial: 'Financial',
    insurance: 'Insurance',
    booking: 'Booking',
    account: 'Account',
    support: 'Support',
  }
  return names[agent] || agent.charAt(0).toUpperCase() + agent.slice(1)
}

export function ChatInterface({ issue, onUpdateIssue, onOpenMenu, knownContext }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set())
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [recordingUrlByMsg, setRecordingUrlByMsg] = useState<Record<string, string | undefined>>({})
  const [activeListenUrl, setActiveListenUrl] = useState<string | undefined>(undefined)
  const [shouldStartPlayback, setShouldStartPlayback] = useState(false)
  const {
    isPlaying: isCallPlaying,
    isConnecting: isCallConnecting,
    error: callAudioError,
    togglePlay: toggleCallAudio,
    canPlay: canPlayCallAudio,
  } = useCallAudio(activeListenUrl)

  useEffect(() => {
    setActiveListenUrl(undefined)
    setShouldStartPlayback(false)
  }, [issue.id])

  // Use the intelligent chat hook
  const { messages: chatMessages, isLoading, isIssueComplete, sendMessage: sendChatMessage, currentAgent } = useChat({
    issueId: issue.id,
    knownContext,
    onIssueComplete: (issueDetails) => {
      console.log('Issue complete:', issueDetails)
      // Do not mark resolved here; it flips after call end via webhook.
      const updatedIssue = {
        ...issue,
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
  // Hide any raw ISSUE_COMPLETE payloads in UI if they slip through
  const cleanChatMessages = chatMessages.filter((m) => !/ISSUE_COMPLETE\s*:/i.test(m.content))

  const enhancedMessages: ExtendedMessage[] = cleanChatMessages.length === 0 ? [
    {
      id: "welcome",
      content: "Hi! I'm here to help you with your issue. Could you please describe what problem you're experiencing?",
      sender: "system" as const,
      timestamp: new Date(),
      type: "text" as const,
    }
  ] : cleanChatMessages.map((msg) => ({ ...msg, type: msg.type || "text" as const }))

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [enhancedMessages])

  // Auto-focus input after AI stops replying
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      // Small delay to ensure message is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isLoading])

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

  useEffect(() => {
    if (!headerRef.current) return

    const updateHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 0)
    }

    updateHeight()

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(headerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    // Set height based on scrollHeight, with max of 200px (about 8 lines)
    const newHeight = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${newHeight}px`
  }, [newMessage])

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    // Allow Shift+Enter for new lines
  }

  const StatusIcon = statusConfig[issue.status as keyof typeof statusConfig]?.icon || MessageCircle

  // Simple PCM player following Vapi docs approach
  const stopCallAudio = () => {
    setShouldStartPlayback(false)
    if (isCallPlaying) {
      toggleCallAudio()
    }
    setActiveListenUrl(undefined)
  }

  const startCallAudio = (listenUrl: string) => {
    if (activeListenUrl !== listenUrl) {
      if (isCallPlaying) {
        toggleCallAudio()
      }
      setActiveListenUrl(listenUrl)
    }
    setShouldStartPlayback(true)
  }

  useEffect(() => {
    if (shouldStartPlayback && activeListenUrl && !isCallPlaying && !isCallConnecting) {
      toggleCallAudio()
      setShouldStartPlayback(false)
    }
  }, [shouldStartPlayback, activeListenUrl, isCallPlaying, isCallConnecting, toggleCallAudio])

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background ios-no-bounce">
      <ScrollArea className="flex-1 min-h-0 overflow-hidden" ref={scrollAreaRef}>
        {/* Sticky in-viewport header to avoid iOS fixed-position issues */}
        <div ref={headerRef} className="sticky top-0 z-30 safe-area bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 h-18">
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
                  <span className="font-mono">#{String(issue.id).slice(0, 5)}</span>
                  <span>•</span>
                  <span>{issue.createdAt.toLocaleDateString()}</span>
                  {currentAgent && currentAgent !== 'router' && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                        {getAgentIcon(currentAgent)}
                        {getAgentDisplayName(currentAgent)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="px-4 pb-28 lg:pb-28"
          style={{
            minHeight: 'calc(100vh - 100px)',
            paddingTop: headerHeight ? headerHeight + 16 : undefined,
          }}
        >
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="h-2" aria-hidden />
          {enhancedMessages.map((message, index) => {
            const isUser = message.sender === "user"
            const anyMsg: any = message as any
            const listenUrl: string | undefined = anyMsg?.monitor?.listenUrl

            const callSummaryNoise =
              message.sender === "system" &&
              /call (started|stopped|ended)|end of call report|generating final report/i.test(message.content ?? "")

            if (callSummaryNoise) {
              return null
            }

            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col space-y-2",
                  isUser ? "items-end" : "items-start"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message.type === "tool-activity" ? (
                  <ToolActivityBubble
                    toolCalls={message.toolCalls || []}
                    isProcessing={isLoading && (message.toolCalls || []).some(tc => !tc.result && !tc.error)}
                    className="w-full max-w-2xl"
                  />
                ) : (
                  <div
                    className={cn(
                      "rounded-3xl px-6 py-4 transition-all duration-300",
                      isUser
                        ? "bg-primary text-primary-foreground liquid-glass-button"
                        : "liquid-glass-card text-card-foreground",
                    )}
                  >
                    {message.type === "transcript" ? (
                      <LiveCallTranscript
                        message={message as ChatMessage}
                        listenUrl={listenUrl}
                        isActive={listenUrl ? activeListenUrl === listenUrl : false}
                        onStartLive={startCallAudio}
                        onStopLive={stopCallAudio}
                        audioState={{
                          isPlaying: isCallPlaying,
                          isConnecting: isCallConnecting,
                          error: callAudioError,
                          canPlay: canPlayCallAudio,
                        }}
                      />
                    ) : (
                      <div className={cn("text-sm", isUser ? "text-white" : undefined)}>
                        <MarkdownContent
                          content={message.content}
                          className={isUser ? "text-white prose-invert" : undefined}
                        />
                      </div>
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
                )}
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
        </div>

        {/* iOS-style Input Area inside viewport to avoid nested scroll */}
        <div className="sticky bottom-0 z-30 safe-area border-t border-border glass-effect bg-background/95 backdrop-blur-sm ios-no-bounce" style={{ paddingBottom: 'var(--kb, 0px)' }}>
          <div className="flex gap-3 max-w-4xl mx-auto p-4 pb-6 lg:pb-4">
            {/* Textarea with Send Button */}
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="min-h-[48px] max-h-[200px] text-sm px-4 pr-14 py-3 rounded-2xl border-border/50 focus:border-border focus:ring-0 focus:ring-offset-0 focus:outline-none ios-transition focus:scale-[1.01] shadow-sm bg-background/80 backdrop-blur-sm resize-none"
                disabled={isLoading}
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-xl modern-hover animate-scale-in shadow-sm ios-button icon-only flex items-center justify-center"
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
      </ScrollArea>
    </div>
  )
}
