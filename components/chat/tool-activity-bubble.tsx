'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Search, Phone, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ToolProgressIndicator } from './tool-progress-indicator'

interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
  timestamp: Date
}

interface ToolActivityBubbleProps {
  toolCalls: ToolCall[]
  isProcessing?: boolean
  className?: string
}

function formatJson(obj: any, compact = false): string {
  try {
    if (compact) {
      const str = JSON.stringify(obj)
      return str.length > 80 ? `${str.slice(0, 80)}...` : str
    }
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function getToolIcon(toolName: string) {
  if (toolName === 'firecrawl_search') return Search
  if (toolName === 'start_call' || toolName === 'dial0_start_call') return Phone
  return ExternalLink
}

function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    'firecrawl_search': 'Web Search',
    'start_call': 'Phone Call',
    'dial0_start_call': 'Phone Call'
  }
  return displayNames[toolName] || toolName
}

function getToolCategory(toolName: string): 'search' | 'call' | 'data' {
  if (toolName === 'firecrawl_search') return 'search'
  if (toolName === 'start_call' || toolName === 'dial0_start_call') return 'call'
  return 'data'
}

function getToolStatusSummary(toolCalls: ToolCall[], isProcessing: boolean): string {
  if (isProcessing) {
    const lastCall = toolCalls[toolCalls.length - 1]
    if (lastCall && !lastCall.result && !lastCall.error) {
      return `Running ${getToolDisplayName(lastCall.name)}...`
    }
  }

  const completedCount = toolCalls.filter(tc => tc.result || tc.error).length
  const totalCount = toolCalls.length

  if (completedCount === 0) {
    return 'Preparing tools...'
  }

  if (completedCount < totalCount) {
    const currentTool = toolCalls.find(tc => !tc.result && !tc.error)
    if (currentTool) {
      return `Running ${getToolDisplayName(currentTool.name)}...`
    }
  }

  // All completed
  const lastTool = toolCalls[toolCalls.length - 1]
  if (lastTool.error) {
    return `${getToolDisplayName(lastTool.name)} failed`
  }
  
  const toolNames = [...new Set(toolCalls.map(tc => tc.name))]
  if (toolNames.length === 1) {
    return `${getToolDisplayName(toolNames[0])} completed`
  }
  
  return `${completedCount} tool${completedCount > 1 ? 's' : ''} completed`
}

export function ToolActivityBubble({ toolCalls, isProcessing = false, className }: ToolActivityBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedArgs, setExpandedArgs] = useState<Set<string>>(new Set())

  if (toolCalls.length === 0) {
    return null
  }

  const summary = getToolStatusSummary(toolCalls, isProcessing)
  const hasErrors = toolCalls.some(tc => tc.error)
  const completedCount = toolCalls.filter(tc => tc.result || tc.error).length
  const totalDuration = toolCalls
    .filter(tc => tc.result || tc.error)
    .reduce((acc, tc) => {
      // Calculate duration from timestamp if result exists
      return acc + 100 // Placeholder - real duration would need start/end times
    }, 0)

  const toggleArgExpansion = (id: string) => {
    setExpandedArgs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Group tools by category
  const toolsByCategory = toolCalls.reduce((acc, call) => {
    const category = getToolCategory(call.name)
    if (!acc[category]) acc[category] = []
    acc[category].push(call)
    return acc
  }, {} as Record<string, ToolCall[]>)

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        hasErrors
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800',
        className
      )}
    >
      {/* Collapsed View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0 text-blue-500" />}
          <span className="text-sm font-medium text-foreground truncate">{summary}</span>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                hasErrors && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              )}
            >
              {completedCount}/{toolCalls.length}
            </Badge>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 ml-2 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(toolsByCategory).map(([category, calls]) => (
            <div key={category} className="space-y-2">
              {/* Category Header (only if multiple categories) */}
              {Object.keys(toolsByCategory).length > 1 && (
                <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground px-1">
                  {category}
                </div>
              )}
              
              {calls.map((call) => {
                const isComplete = Boolean(call.result || call.error)
                const isError = Boolean(call.error)
                const Icon = getToolIcon(call.name)
                const argsExpanded = expandedArgs.has(call.id)
                const hasArgs = call.arguments && Object.keys(call.arguments).length > 0

                // Calculate duration (placeholder - would need actual start/end times)
                const duration = isComplete ? 1250 : undefined

                // Determine status
                const status = isError ? 'error' : isComplete ? 'complete' : 'running'

                return (
                  <div
                    key={call.id}
                    className={cn(
                      'rounded-lg border p-3 text-xs space-y-2.5 transition-all',
                      isError
                        ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                        : isComplete
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    )}
                  >
                    {/* Tool Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className={cn(
                          "h-3.5 w-3.5 flex-shrink-0",
                          isError && "text-red-500",
                          isComplete && !isError && "text-emerald-500",
                          !isComplete && "text-blue-500"
                        )} />
                        <span className="font-semibold text-foreground">
                          {getToolDisplayName(call.name)}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px] flex-shrink-0">
                        {call.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Progress Indicator */}
                    <ToolProgressIndicator 
                      status={status}
                      duration={duration}
                      startTime={!isComplete ? call.timestamp : undefined}
                    />

                    {/* Arguments - Collapsed by default */}
                    {hasArgs && (
                      <div>
                        <button
                          onClick={() => toggleArgExpansion(call.id)}
                          className="text-muted-foreground font-medium mb-1 hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <span>Arguments</span>
                          {argsExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        {argsExpanded ? (
                          <pre className="bg-slate-100 dark:bg-slate-800 rounded p-2 overflow-x-auto text-[10px] font-mono">
                            <code>{formatJson(call.arguments)}</code>
                          </pre>
                        ) : (
                          <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-[10px] font-mono text-muted-foreground truncate">
                            {formatJson(call.arguments, true)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Result Preview */}
                    {call.result !== undefined && (
                      <div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium mb-1 flex items-center gap-1">
                          <span>Result</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2 text-[10px] font-mono max-h-32 overflow-y-auto">
                          <code className="text-emerald-700 dark:text-emerald-300">
                            {formatJson(call.result, true)}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {call.error && (
                      <div>
                        <div className="text-red-600 dark:text-red-400 font-medium mb-1">Error</div>
                        <div className="bg-red-100 dark:bg-red-900/20 rounded p-2 text-[10px] leading-relaxed">
                          <code className="text-red-700 dark:text-red-300">{call.error}</code>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
