"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Issue, Message } from "@/app/page"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
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
  Camera,
  Play,
  Pause,
  Radio,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { useCallAudio } from "@/hooks/use-call-audio"
// Compact inline audio player for recorded calls
function InlineAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  const fmt = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onLoaded = () => setDuration(a.duration || 0)
    const onTime = () => setCurrent(a.currentTime || 0)
    const onEnded = () => setIsPlaying(false)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnded)
    }
  }, [])

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      try { await a.play() } catch {}
      setIsPlaying(true)
    } else {
      a.pause()
      setIsPlaying(false)
    }
  }

  const seek = (vals: number[]) => {
    const a = audioRef.current
    if (!a || !vals?.length) return
    const t = Math.min(Math.max(vals[0], 0), duration || 0)
    a.currentTime = t
    setCurrent(t)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" className="h-8 px-2" onClick={toggle}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <Slider value={[duration ? current : 0]} min={0} max={Math.max(duration, 1)} step={0.1} onValueChange={seek} className="w-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  )
}
// Markdown renderer with custom styling
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
        // Custom styling for markdown elements
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        a: ({ children, href }) => (
          <a href={href} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs" {...props}>
              {children}
            </code>
          ) : (
            <code className="block p-3 rounded-lg bg-muted text-foreground font-mono text-xs overflow-x-auto" {...props}>
              {children}
            </code>
          ),
        pre: ({ children }) => <pre className="mb-2 last:mb-0 overflow-x-auto">{children}</pre>,
        ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-3 py-1 my-2 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="my-3 border-border" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse border border-border text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
        th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}

import { useChat } from "@/hooks/use-chat"
import { TimelineIndicator } from "@/components/timeline-indicator"
import { IssueIcon } from "@/components/issue-icon"

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
  type?: "text" | "system" | "transcript" | "status" | "info" | "data-summary" | "data-operation" | "data-component" | "data-artifact"
  transcript?: { user: string; system: string }[]
  isExpanded?: boolean
  data?: any
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
}

export function ChatInterface({ issue, onUpdateIssue, onOpenMenu, knownContext }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set())
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
  const { messages: chatMessages, isLoading, isIssueComplete, sendMessage: sendChatMessage } = useChat({
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
        <div className="sticky top-0 z-30 safe-area bg-background/95 backdrop-blur-sm border-b border-border">
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
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 pb-28 lg:pb-28" style={{minHeight: 'calc(100vh - 100px)'}} >
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="h-2" aria-hidden />
          {enhancedMessages.map((message, index) => {
            const isUser = message.sender === "user"
            const messageConfig = messageTypeConfig[message.type || "text"]
            const MessageIcon = messageConfig.icon
            const isExpanded = expandedTranscripts.has(message.id)
            const anyMsg: any = message as any
            const listenUrl: string | undefined = anyMsg?.monitor?.listenUrl
            const isEnded: boolean = Boolean(anyMsg?.isEnded)
            const recordingUrl: string | undefined = anyMsg?.recordingUrl

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
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{message.content}</p>
                          <div className="flex items-center gap-1">
                            {/* Listen Live control */}
                            {listenUrl && !isEnded && (
                              activeListenUrl === listenUrl ? (
                                isCallConnecting ? (
                                  <Button variant="secondary" size="sm" className="h-7 px-2" disabled>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Connecting
                                  </Button>
                                ) : isCallPlaying ? (
                                  <Button variant="secondary" size="sm" className="h-7 px-2" onClick={stopCallAudio}>
                                    <Pause className="h-3 w-3 mr-1" /> Stop
                                  </Button>
                                ) : (
                                  <Button variant="secondary" size="sm" className="h-7 px-2" onClick={() => startCallAudio(listenUrl)} disabled={!canPlayCallAudio}>
                                    <Radio className="h-3 w-3 mr-1" /> Listen live
                                  </Button>
                                )
                              ) : (
                                <Button variant="secondary" size="sm" className="h-7 px-2" onClick={() => startCallAudio(listenUrl)}>
                                  <Radio className="h-3 w-3 mr-1" /> Listen live
                                </Button>
                              )
                            )}
                            {callAudioError && activeListenUrl === listenUrl && (
                              <span className="text-xs text-red-500 ml-2">{callAudioError}</span>
                            )}
                            {/* Live badge while call is ongoing */}
                            {!isEnded && (
                              <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTranscript(message.id)}
                              className="h-6 w-6 p-0 ml-1"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>

                        {/* Inline recording player */}
                        {recordingUrl && (
                          <div className="mt-2">
                            <InlineAudioPlayer src={recordingUrl} />
                          </div>
                        )}

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
                      <div className="text-sm">
                        <MarkdownContent content={message.content} />
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
