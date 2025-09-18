"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Phone, 
  Bot, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Volume2,
  Mic
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveResponseMessage {
  id: string
  timestamp: Date
  speaker: "ai_agent" | "phone_representative"
  content: string
  type?: "speaking" | "listening" | "processing"
}

interface LiveResponseProps {
  issueId: string
  className?: string
}

// Demo data for testing
const demoMessages: LiveResponseMessage[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    speaker: "ai_agent",
    content: "Hello, I'm calling regarding a technical support issue. I need to speak with someone about a billing discrepancy.",
    type: "speaking"
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 280000),
    speaker: "phone_representative",
    content: "Hello! Thank you for calling customer support. I'd be happy to help you with your billing concern. Can you please provide me with your account number?",
    type: "speaking"
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 260000),
    speaker: "ai_agent",
    content: "Yes, the account number is AC-789456123. The issue is related to a charge that appeared on the account that we don't recognize.",
    type: "speaking"
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 240000),
    speaker: "phone_representative",
    content: "Let me look that up for you. I can see your account here. Can you tell me more about which specific charge you're referring to?",
    type: "speaking"
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 220000),
    speaker: "ai_agent",
    content: "There's a charge for $127.99 on March 8th that we don't have any record of authorizing. It shows as 'Premium Service Upgrade' but we never requested this.",
    type: "speaking"
  },
  {
    id: "6",
    timestamp: new Date(Date.now() - 200000),
    speaker: "phone_representative",
    content: "I understand your concern. Let me investigate this charge for you. I can see the premium service upgrade was activated, but let me check if this was done in error.",
    type: "processing"
  },
  {
    id: "7",
    timestamp: new Date(Date.now() - 180000),
    speaker: "phone_representative",
    content: "I've reviewed your account and I can see this charge was applied incorrectly. I'll be able to reverse this charge for you right away. The refund should appear in your account within 3-5 business days.",
    type: "speaking"
  },
  {
    id: "8",
    timestamp: new Date(Date.now() - 160000),
    speaker: "ai_agent",
    content: "That's excellent, thank you so much for resolving this quickly. Will I receive any confirmation of this refund?",
    type: "speaking"
  },
  {
    id: "9",
    timestamp: new Date(Date.now() - 140000),
    speaker: "phone_representative",
    content: "Absolutely! You'll receive an email confirmation within the next hour, and you can also see the pending refund in your account dashboard. Is there anything else I can help you with today?",
    type: "speaking"
  },
  {
    id: "10",
    timestamp: new Date(Date.now() - 120000),
    speaker: "ai_agent",
    content: "No, that resolves everything. Thank you for your excellent customer service!",
    type: "speaking"
  }
]

export function LiveResponse({ issueId, className }: LiveResponseProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [messages] = useState<LiveResponseMessage[]>(demoMessages)

  // Only show for issues starting with jh79g
  const shouldShowForIssue = issueId.toLowerCase().startsWith('jh79g')
  
  if (!shouldShowForIssue) {
    return null
  }

  const getSpeakerConfig = (speaker: LiveResponseMessage["speaker"]) => {
    return speaker === "ai_agent" 
      ? {
          icon: Bot,
          label: "AI Agent",
          bgClass: "bg-blue-50 dark:bg-blue-950/30",
          borderClass: "border-blue-200 dark:border-blue-800",
          iconColor: "text-blue-600 dark:text-blue-400"
        }
      : {
          icon: User,
          label: "Phone Rep",
          bgClass: "bg-green-50 dark:bg-green-950/30", 
          borderClass: "border-green-200 dark:border-green-800",
          iconColor: "text-green-600 dark:text-green-400"
        }
  }

  const getTypeIndicator = (type?: LiveResponseMessage["type"]) => {
    switch (type) {
      case "speaking":
        return <Volume2 className="h-3 w-3 text-muted-foreground animate-pulse" />
      case "listening":
        return <Mic className="h-3 w-3 text-muted-foreground" />
      case "processing":
        return <div className="flex space-x-1">
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
      default:
        return null
    }
  }

  return (
    <div className={cn("w-full max-w-5xl mx-auto", className)}>
      {/* Toggle Button */}
      <div className="flex justify-center mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="flex items-center gap-2 rounded-full"
        >
          <Phone className="h-4 w-4" />
          {isVisible ? "Hide" : "Show"} Live Call
          {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Live Response Panel */}
      {isVisible && (
        <Card className="w-full animate-fade-in-up border-2 border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <Phone className="h-5 w-5" />
                  Live Call Transcription
                </div>
              </CardTitle>
              <Badge variant="secondary" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                Recording
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time conversation between AI agent and customer service representative
            </p>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-80 w-full pr-4">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const config = getSpeakerConfig(message.speaker)
                  const SpeakerIcon = config.icon
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 animate-fade-in-up",
                        message.speaker === "ai_agent" ? "justify-start" : "justify-end"
                      )}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {message.speaker === "ai_agent" && (
                        <div className="flex-shrink-0">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bgClass, config.borderClass, "border")}>
                            <SpeakerIcon className={cn("h-4 w-4", config.iconColor)} />
                          </div>
                        </div>
                      )}
                      
                      <div className={cn(
                        "max-w-[70%] transition-all duration-300",
                        message.speaker === "phone_representative" && "ml-auto"
                      )}>
                        <div className={cn(
                          "rounded-2xl px-4 py-3 border transition-all duration-300",
                          config.bgClass,
                          config.borderClass
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-xs font-medium", config.iconColor)}>
                              {config.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {getTypeIndicator(message.type)}
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground">
                            {message.content}
                          </p>
                        </div>
                      </div>
                      
                      {message.speaker === "phone_representative" && (
                        <div className="flex-shrink-0">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bgClass, config.borderClass, "border")}>
                            <SpeakerIcon className={cn("h-4 w-4", config.iconColor)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            
            {/* Status Bar */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Call in progress</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Duration: {Math.floor(messages.length * 0.5)}m {(messages.length * 30) % 60}s</span>
                  <span>{messages.length} exchanges</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

