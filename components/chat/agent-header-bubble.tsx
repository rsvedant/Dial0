'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type AgentType = 'router' | 'financial' | 'insurance' | 'booking' | 'account' | 'support'

interface AgentHeaderBubbleProps {
  agent: AgentType
  displayName: string
  emoji: string
  description: string
  className?: string
}

const agentColors: Record<AgentType, { bg: string; border: string; text: string }> = {
  router: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300'
  },
  financial: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300'
  },
  insurance: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300'
  },
  booking: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300'
  },
  account: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300'
  },
  support: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-700 dark:text-pink-300'
  }
}

export function AgentHeaderBubble({ 
  agent, 
  displayName, 
  emoji, 
  description,
  className 
}: AgentHeaderBubbleProps) {
  const colors = agentColors[agent]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border p-4 backdrop-blur-sm',
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Agent Emoji */}
        <div className="text-2xl flex-shrink-0" role="img" aria-label={agent}>
          {emoji}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm', colors.text)}>
            {displayName}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        </div>

        {/* Agent Badge */}
        <div className={cn(
          'px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wide flex-shrink-0',
          colors.bg,
          colors.text
        )}>
          {agent}
        </div>
      </div>
    </motion.div>
  )
}

