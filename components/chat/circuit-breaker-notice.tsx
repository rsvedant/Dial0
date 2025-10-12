'use client'

import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface CircuitBreakerNoticeProps {
  toolName: string
  failures: number
  lastError?: string
  onRetry?: () => void
  className?: string
}

export function CircuitBreakerNotice({ 
  toolName, 
  failures, 
  lastError,
  onRetry,
  className 
}: CircuitBreakerNoticeProps) {
  const getToolDisplayName = (name: string) => {
    const displayNames: Record<string, string> = {
      'firecrawl_search': 'Web Search',
      'start_call': 'Phone Call',
      'dial0_start_call': 'Phone Call'
    }
    return displayNames[name] || name
  }

  const getUserFriendlyMessage = (name: string) => {
    if (name === 'firecrawl_search') {
      return 'I\'m having trouble searching the web right now. You can try rephrasing your request or providing more specific details.'
    }
    if (name === 'start_call' || name === 'dial0_start_call') {
      return 'I\'m having trouble initiating calls right now. Please make sure all required information is provided and try again.'
    }
    return 'This tool is temporarily unavailable. Please try a different approach or rephrase your request.'
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="font-semibold text-sm text-amber-900 dark:text-amber-100">
              Tool Temporarily Unavailable
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {getToolDisplayName(toolName)} failed {failures} times in a row
            </div>
          </div>

          <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {getUserFriendlyMessage(toolName)}
          </div>

          {lastError && (
            <details className="text-xs">
              <summary className="cursor-pointer text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px] overflow-x-auto font-mono">
                {lastError}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" />
                Try Again
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 text-amber-700 dark:text-amber-300"
            >
              <MessageSquare className="h-3 w-3" />
              Ask for Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

