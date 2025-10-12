'use client'

import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface ToolProgressIndicatorProps {
  status: 'queued' | 'running' | 'complete' | 'error'
  duration?: number // in milliseconds
  estimatedDuration?: number // in milliseconds
  startTime?: Date
}

export function ToolProgressIndicator({ 
  status, 
  duration, 
  estimatedDuration,
  startTime 
}: ToolProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // Live timer for running tools
  useEffect(() => {
    if (status === 'running' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime())
      }, 100)
      return () => clearInterval(interval)
    }
  }, [status, startTime])

  const displayDuration = duration ?? elapsedTime

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}s`
  }

  const getProgressPercentage = () => {
    if (!estimatedDuration || displayDuration === 0) return 0
    return Math.min((displayDuration / estimatedDuration) * 100, 95) // Cap at 95% until complete
  }

  return (
    <div className="flex items-center gap-2">
      {/* Status Icon */}
      {status === 'queued' && (
        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      )}
      {status === 'running' && (
        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
      )}
      {status === 'complete' && (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      )}
      {status === 'error' && (
        <XCircle className="h-3.5 w-3.5 text-red-500" />
      )}

      {/* Progress Bar (for running state with estimated duration) */}
      {status === 'running' && estimatedDuration && (
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      )}

      {/* Duration Display */}
      {displayDuration > 0 && (
        <span
          className={cn(
            'text-[10px] font-mono tabular-nums',
            status === 'complete' && 'text-emerald-600 dark:text-emerald-400',
            status === 'running' && 'text-blue-600 dark:text-blue-400',
            status === 'error' && 'text-red-600 dark:text-red-400',
            status === 'queued' && 'text-slate-500 dark:text-slate-400'
          )}
        >
          {formatDuration(displayDuration)}
        </span>
      )}

      {/* Status Text */}
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide',
          status === 'complete' && 'text-emerald-600 dark:text-emerald-400',
          status === 'running' && 'text-blue-600 dark:text-blue-400',
          status === 'error' && 'text-red-600 dark:text-red-400',
          status === 'queued' && 'text-slate-500 dark:text-slate-400'
        )}
      >
        {status === 'queued' && 'Queued'}
        {status === 'running' && 'Running'}
        {status === 'complete' && 'Complete'}
        {status === 'error' && 'Failed'}
      </span>
    </div>
  )
}

