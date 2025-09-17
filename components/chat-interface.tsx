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
  Hash,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
  issue: Issue
  onUpdateIssue: (issue: Issue) => void
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

export function ChatInterface({ issue, onUpdateIssue }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const enhancedMessages: ExtendedMessage[] = [
    ...issue.messages.map((msg) => ({ ...msg, type: "text" as const })),
    {
      id: "transcript-1",
      content: "Previous conversation summary available",
      sender: "system" as const,
      timestamp: new Date(Date.now() - 86400000),
      type: "transcript" as const,
      transcript: [
        { user: "I'm having trouble with login", system: "Let me help you troubleshoot the login issue." },
        { user: "The password reset isn't working", system: "I'll check the password reset functionality for you." },
        { user: "Still not working", system: "Let me escalate this to our technical team." },
      ],
    },
    {
      id: "status-1",
      content: "Issue status updated to In Progress",
      sender: "system" as const,
      timestamp: new Date(Date.now() - 43200000),
      type: "status" as const,
    },
    {
      id: "info-1",
      content: "Tip: You can attach screenshots by dragging and dropping files into the chat",
      sender: "system" as const,
      timestamp: new Date(Date.now() - 21600000),
      type: "info" as const,
    },
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [issue.messages])

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

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date(),
    }

    const updatedIssue = {
      ...issue,
      messages: [...issue.messages, userMessage],
    }

    onUpdateIssue(updatedIssue)
    setNewMessage("")
    setIsTyping(true)

    // Simulate system response
    setTimeout(() => {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Thank you for your message. I'm analyzing your issue and will provide assistance shortly. Is there any additional information you can provide?",
        sender: "system",
        timestamp: new Date(),
      }

      const finalIssue = {
        ...updatedIssue,
        messages: [...updatedIssue.messages, systemMessage],
        status: updatedIssue.status === "open" ? ("in-progress" as const) : updatedIssue.status,
      }

      onUpdateIssue(finalIssue)
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const StatusIcon = statusConfig[issue.status].icon

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="fixed top-0 right-0 left-0 lg:left-64 z-20 px-4 py-3 border-b border-border glass-effect animate-slide-down bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-mono">#{issue.id}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <h2 className="text-sm font-semibold text-foreground line-clamp-1 flex-1">{issue.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{issue.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{issue.messages.length}</span>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full animate-scale-in",
                statusConfig[issue.status].color,
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig[issue.status].label}
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 pt-20" ref={scrollAreaRef}>
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
                {!isUser && (
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center animate-scale-in shadow-sm",
                      message.type === "system"
                        ? "bg-blue-500"
                        : message.type === "transcript"
                          ? "bg-amber-500"
                          : message.type === "status"
                            ? "bg-green-500"
                            : message.type === "info"
                              ? "bg-purple-500"
                              : "bg-primary",
                    )}
                  >
                    <MessageIcon className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={cn("max-w-[80%] transition-all duration-300", isUser && "ml-auto")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm border transition-all duration-300 hover:shadow-md",
                      isUser
                        ? "bg-primary text-primary-foreground border-primary/20"
                        : cn(messageConfig.bgClass, messageConfig.borderClass, "text-card-foreground"),
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
                            {message.transcript.map((exchange, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-start gap-2">
                                  <User className="h-3 w-3 mt-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{exchange.user}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Bot className="h-3 w-3 mt-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">{exchange.system}</p>
                                </div>
                                {idx < message.transcript.length - 1 && (
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

                {isUser && (
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center animate-scale-in shadow-sm">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            )
          })}

          {isTyping && (
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

      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-20 p-4 border-t border-border glass-effect animate-fade-in-up bg-background/95 backdrop-blur-sm">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="h-12 text-sm px-4 pr-14 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300 focus:scale-[1.01] shadow-sm bg-background/80 backdrop-blur-sm"
              disabled={isTyping}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isTyping}
              className="absolute right-1.5 top-1.5 h-9 w-9 p-0 rounded-xl modern-hover animate-scale-in shadow-sm"
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isTyping && (
          <div className="flex justify-center mt-3">
            <div className="text-xs text-muted-foreground animate-pulse bg-muted/50 px-3 py-1 rounded-full">
              AI is analyzing your message...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
