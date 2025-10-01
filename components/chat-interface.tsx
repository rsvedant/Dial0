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
  Camera,
  Pause,
  Play,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
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
  const inputRef = useRef<HTMLInputElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pcmBufferRef = useRef<Int16Array[]>([]) // Store PCM chunks
  const [isListeningLive, setIsListeningLive] = useState(false)
  const [recordingUrlByMsg, setRecordingUrlByMsg] = useState<Record<string, string | undefined>>({})

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

  const StatusIcon = statusConfig[issue.status as keyof typeof statusConfig]?.icon || MessageCircle

  // Simple PCM player following Vapi docs approach
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const playPcmChunk = (pcmData: Int16Array) => {
    const ctx = ensureAudioContext()
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {})
    }
    
    // Vapi sends raw PCM at 16kHz mono (standard for telephony)
    const sampleRate = 16000
    const audioBuffer = ctx.createBuffer(1, pcmData.length, sampleRate)
    const channel = audioBuffer.getChannelData(0)
    
    // Convert Int16 to Float32 [-1, 1]
    for (let i = 0; i < pcmData.length; i++) {
      channel[i] = pcmData[i] / 32768
    }
    
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.start()
  }

  const startListening = (listenUrl: string) => {
    if (wsRef.current) stopListening()
    
    pcmBufferRef.current = [] // Reset buffer
    
    try {
      const ws = new WebSocket(listenUrl)
      ws.binaryType = 'arraybuffer'
      
      ws.onopen = () => {
        console.log('📞 Live audio stream connected')
        setIsListeningLive(true)
      }
      
      ws.onmessage = (evt) => {
        if (evt.data instanceof ArrayBuffer) {
          // Raw PCM data from Vapi
          const pcmChunk = new Int16Array(evt.data)
          pcmBufferRef.current.push(pcmChunk) // Store for potential saving
          playPcmChunk(pcmChunk) // Play immediately
        }
      }
      
      ws.onclose = () => {
        console.log('📞 Live audio stream closed')
        setIsListeningLive(false)
      }
      
      ws.onerror = (err) => {
        console.error('📞 Live audio stream error:', err)
        setIsListeningLive(false)
      }
      
      wsRef.current = ws
    } catch (e) {
      console.error('Failed to open live audio WebSocket:', e)
      setIsListeningLive(false)
    }
  }
  const stopListening = () => {
    try { wsRef.current?.close() } catch {}
    wsRef.current = null
    setIsListeningLive(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { wsRef.current?.close() } catch {}
      try { audioCtxRef.current?.close() } catch {}
    }
  }, [])

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
                              isListeningLive ? (
                                <Button variant="secondary" size="sm" className="h-7 px-2" onClick={stopListening}>
                                  <Pause className="h-3 w-3 mr-1" /> Stop
                                </Button>
                              ) : (
                                <Button variant="secondary" size="sm" className="h-7 px-2" onClick={() => startListening(listenUrl)}>
                                  <Radio className="h-3 w-3 mr-1" /> Listen live
                                </Button>
                              )
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
        </div>

        {/* iOS-style Input Area inside viewport to avoid nested scroll */}
        <div className="sticky bottom-0 z-30 safe-area border-t border-border glass-effect bg-background/95 backdrop-blur-sm ios-no-bounce" style={{ paddingBottom: 'var(--kb, 0px)' }}>
          <div className="flex gap-3 max-w-4xl mx-auto p-4 pb-6 lg:pb-4">
            {/* Camera Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 rounded-2xl modern-hover ios-button icon-only flex-shrink-0"
              disabled={isLoading}
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            {/* Input with Send Button */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="h-12 text-sm px-4 pr-14 rounded-2xl border-border/50 focus:border-border focus:ring-0 focus:ring-offset-0 focus:outline-none ios-transition focus:scale-[1.01] shadow-sm bg-background/80 backdrop-blur-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-xl modern-hover animate-scale-in shadow-sm ios-button icon-only flex items-center justify-center"
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
