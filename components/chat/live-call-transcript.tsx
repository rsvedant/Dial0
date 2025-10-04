'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineAudioPlayer } from '@/components/chat/inline-audio-player'
import { MarkdownContent } from '@/components/chat/markdown-content'
import { cn } from '@/lib/utils'
import { ChatMessage, TranscriptEntry, CallStatusEntry } from '@/hooks/use-chat'
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Radio,
  User,
  Waves,
} from 'lucide-react'

interface LiveCallTranscriptProps {
  message: ChatMessage
  listenUrl?: string
  isActive: boolean
  onStartLive(listenUrl: string): void
  onStopLive(): void
  audioState: {
    isPlaying: boolean
    isConnecting: boolean
    error: string | null
    canPlay: boolean
  }
}

const STATUS_META: Record<NonNullable<LiveCallTranscriptProps['message']['status']>, {
  label: string
  tone: string
  dot: string
}> = {
  pending: {
    label: 'Waiting to start',
    tone: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-400',
  },
  in_progress: {
    label: 'Live',
    tone: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500 animate-pulse',
  },
  completed: {
    label: 'Completed',
    tone: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800',
    dot: 'bg-slate-400',
  },
  error: {
    label: 'Attention required',
    tone: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800',
    dot: 'bg-red-500 animate-pulse',
  },
}

export function LiveCallTranscript({
  message,
  listenUrl,
  isActive,
  onStartLive,
  onStopLive,
  audioState,
}: LiveCallTranscriptProps) {
  const [isOpen, setIsOpen] = useState(message.status !== 'completed')
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const statusKey = message.status ?? 'pending'
  const statusMeta = STATUS_META[statusKey]

  const finalEntries = useMemo(() => message.finalTranscript ?? [], [message.finalTranscript])
  const hasFinalTranscript = finalEntries.length > 0
  const summaryMarkdown = useMemo(() => message.finalSummary ?? '', [message.finalSummary])
  const hasSummary = summaryMarkdown.trim().length > 0
  const callOutcome = message.callOutcome

  const conversation: TranscriptEntry[] = useMemo(() => {
    const entries = hasFinalTranscript ? finalEntries : (message.conversation ?? [])
    return [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }, [finalEntries, hasFinalTranscript, message.conversation])

  const statusLog: CallStatusEntry[] = useMemo(() => {
    const entries = message.statusLog ?? []
    return [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }, [message.statusLog])

  useEffect(() => {
    if (!isOpen || !bodyRef.current) return
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [conversation.length, isOpen])

  const handleStart = () => {
    if (listenUrl) {
      onStartLive(listenUrl)
    }
  }

  const hasListenUrl = Boolean(listenUrl)
  const canActivateLive = isActive ? audioState.canPlay : hasListenUrl

  const liveButtonDisabled =
    hasFinalTranscript ||
    !hasListenUrl ||
    !canActivateLive ||
    (isActive && audioState.isConnecting)

  let liveButtonContent: React.ReactNode = null
  let liveButtonAction: (() => void) | undefined

  if (!listenUrl || hasFinalTranscript) {
    liveButtonContent = (
      <>
        <Waves className="mr-1 h-3 w-3" />
        {hasFinalTranscript ? 'Call finished' : 'Audio unavailable'}
      </>
    )
  } else if (isActive) {
    if (audioState.isConnecting) {
      liveButtonContent = (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Connecting
        </>
      )
    } else if (audioState.isPlaying) {
      liveButtonContent = (
        <>
          <Pause className="mr-1 h-3 w-3" />
          Stop
        </>
      )
      liveButtonAction = onStopLive
    } else {
      liveButtonContent = (
        <>
          <Radio className="mr-1 h-3 w-3" />
          Resume
        </>
      )
      liveButtonAction = handleStart
    }
  } else {
    liveButtonContent = (
      <>
        <Radio className="mr-1 h-3 w-3" />
        Listen live
      </>
    )
    liveButtonAction = handleStart
  }

  const transcriptPairs = hasFinalTranscript ? [] : (message.transcript ?? [])
  const hasConversation = conversation.length > 0

  const headerTitle = hasFinalTranscript ? 'Final transcript' : 'Live call transcript'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="font-medium">{headerTitle}</span>
              {listenUrl && (
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                  {message.callId ? `Call ${message.callId.slice(-6).toUpperCase()}` : 'Live'}
                </Badge>
              )}
            </div>
            <div className="text-sm font-medium text-foreground">
              {message.statusText ?? 'Waiting for updates'}
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition-colors',
                statusMeta.tone,
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', statusMeta.dot)} />
              {statusMeta.label}
            </div>
            {callOutcome && (
              <div
                className={cn(
                  'flex flex-col gap-1 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-sm',
                  callOutcome.status === 'pass'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : callOutcome.status === 'fail'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                    : 'border-border bg-muted text-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-current" />
                  <span>{callOutcome.label}</span>
                </div>
                {callOutcome.detail && (
                  <MarkdownContent
                    content={callOutcome.detail}
                    variant="compact"
                    className="text-foreground/80"
                  />
                )}
              </div>
            )}
            {hasSummary && (
              <div className="space-y-2 text-sm text-foreground">
                <div className="text-xs font-semibold uppercase tracking-wide">Summary</div>
                <MarkdownContent content={summaryMarkdown} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-start">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 rounded-xl px-3"
              onClick={liveButtonAction}
              disabled={liveButtonDisabled || !liveButtonAction}
            >
              {liveButtonContent}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? 'Collapse transcript' : 'Expand transcript'}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {audioState.error && isActive && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {audioState.error}
          </div>
        )}
        {message.recordingUrl && (
          <div className="mt-2">
            <InlineAudioPlayer src={message.recordingUrl} />
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="transcript-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40 shadow-inner"
          >
            <div ref={bodyRef} className="max-h-80 overflow-y-auto p-4">
              {statusLog.length > 0 && (
                <div className="mb-4 space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status updates
                  </div>
                  <div className="space-y-2">
                    {statusLog.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <div className="flex items-start gap-3 text-xs text-muted-foreground">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                          <div className="flex-1 space-y-1">
                            <div className="font-medium text-foreground">
                              {entry.markdown ? (
                                <MarkdownContent content={entry.markdown} variant="compact" />
                              ) : (
                                entry.label
                              )}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                              {entry.createdAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(hasConversation ? conversation : transcriptPairs).map((entry, index) => {
                  if (!hasConversation) {
                    const pair = transcriptPairs[index]
                    return (
                      <div key={`pair-${index}`} className="space-y-2 text-xs">
                        {pair.user && <BubbleRow role="user" content={pair.user} />}
                        {pair.system && <BubbleRow role="assistant" content={pair.system} />}
                      </div>
                    )
                  }

                  const typedEntry = entry as TranscriptEntry
                  return <BubbleRow key={typedEntry.id} role={typedEntry.role} content={typedEntry.content} />
                })}

                {message.isEnded && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Call completed. Awaiting summary and follow-up details.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BubbleRow({ role, content }: { role: TranscriptEntry['role']; content: string }) {
  const isUser = role === 'user'
  const Icon = isUser ? User : Bot

  return (
    <div
      className={cn(
        'flex items-start gap-2 text-sm',
        isUser ? 'justify-start flex-row' : 'justify-start flex-row-reverse sm:flex-row',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm',
          isUser ? 'order-none' : 'order-none',
        )}
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div
        className={cn(
          'max-w-full flex-1 rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm',
          isUser
            ? 'bg-background text-foreground border border-border/70'
            : 'bg-primary/10 text-foreground border border-primary/20',
        )}
      >
        <MarkdownContent content={content} variant="compact" className="prose-invert-0" />
      </div>
    </div>
  )
}