import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export interface CallStatusEntry {
  id: string
  status: string
  label: string
  createdAt: Date
  type: 'status' | 'lifecycle'
  markdown?: string
}

export interface CallOutcomeInfo {
  label: string
  status: 'pass' | 'fail' | 'unknown'
  detail?: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'system'
  timestamp: Date
  type?: 'text' | 'system' | 'transcript' | 'status' | 'info' | 'data-summary' | 'data-operation' | 'data-component' | 'data-artifact'
  data?: any // For data events
  transcript?: { user: string; system: string }[]
  monitor?: { listenUrl?: string; controlUrl?: string }
  isEnded?: boolean
  recordingUrl?: string
  recordingMeta?: any
  conversation?: TranscriptEntry[]
  status?: 'pending' | 'in_progress' | 'completed' | 'error'
  statusLog?: CallStatusEntry[]
  statusText?: string
  callId?: string
  finalTranscript?: TranscriptEntry[]
  finalTranscriptText?: string
  finalSummary?: string
  callOutcome?: CallOutcomeInfo
}

interface UseChatOptions {
  issueId: string
  onIssueComplete?: (issueDetails: string) => void
  knownContext?: any
}

function formatListMarkdown(text?: string) {
  if (!text) return ''

  let result = text

  if (/Summary:\s*/i.test(result)) {
    result = result.replace(/Summary:\s*/gi, 'Summary:\n\n')
  }

  if (result.includes('*')) {
    result = result.replace(/\s*\*\s+/g, '\n* ')
  }

  return result.trim()
}

function parseFinalTranscript(raw: string, baseTime: Date, callKey: string): TranscriptEntry[] {
  const normalized = raw?.replace(/\r\n/g, '\n') ?? ''
  if (!normalized.trim()) return []

  const segments = normalized
    .split(/(?=(?:AI|User)\s*:)/gi)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const entries: TranscriptEntry[] = []

  segments.forEach((segment, index) => {
    const match = segment.match(/^(AI|User)\s*:\s*(.*)$/i)
    if (!match) return

    const roleLabel = match[1].toLowerCase()
    const content = (match[2] ?? '').trim()
    if (!content) return

    entries.push({
      id: `${callKey}-final-${index}`,
      role: roleLabel === 'user' ? 'user' : 'assistant',
      content,
      createdAt: new Date(baseTime.getTime() + index),
    })
  })

  return entries
}

export function useChat({ issueId, onIssueComplete, knownContext }: UseChatOptions) {
  // Live messages from Convex
  const convexMessages = useQuery(api.orchestration.listMessages, issueId ? { issueId } : "skip") as any[] | undefined
  const callEvents = useQuery(api.orchestration.listCallEvents, issueId ? { issueId } : "skip") as any[] | undefined
  const issue = useQuery(api.orchestration.getIssue, issueId ? { id: issueId as any } : "skip")
  const appendMessage = useMutation(api.orchestration.appendMessage)
  const updateIssueStatus = useMutation(api.orchestration.updateIssueStatus)
  const updateIssueChatId = useMutation(api.orchestration.updateIssueChatId)
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isIssueComplete, setIsIssueComplete] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Track loading state and streaming message
  const [aiLoading, setAiLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const [streamEvents, setStreamEvents] = useState<any[]>([]) // All stream events for display
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages([])
    setIsIssueComplete(false)
    setStreamingMessage(null)
    setStreamEvents([])
  }, [issueId])

  // Project Convex rows to ChatMessage shape and merge with streaming message
  useEffect(() => {
    if (!convexMessages) return
    let mapped: ChatMessage[] = convexMessages.map((row) => ({
      id: row._id,
      content: row.content,
      sender: row.role === 'user' ? 'user' : 'system',
      timestamp: new Date(row.createdAt),
      type: row.role === 'system' ? 'system' : 'text',
    }))
    
    // Add streaming message if active
    if (streamingMessage) {
      mapped = [...mapped, streamingMessage]
    }
    
    // Add stream event messages (data-summary, data-operation, etc.)
    // Filter out agent_initializing and other noise operations
    const eventMessages: ChatMessage[] = (streamEvents ?? [])
      .filter((evt: any) => {
        if (!['data-summary', 'data-operation', 'data-component', 'data-artifact'].includes(evt.type)) {
          return false
        }
        if (evt.type === 'data-summary') {
          const label = evt.data?.label || evt.data?.content || evt.content || ''
          if (/call (?:ended|complete)|generating final report/i.test(label)) {
            return false
          }
          return true
        }
        if (evt.type === 'data-operation') {
          const opType = evt.data?.type
          if (['agent_initializing', 'agent_ready', 'completion'].includes(opType)) {
            return false
          }
        }
        return true
      })
      .map((evt: any) => ({
        id: `evt-${Date.now()}-${Math.random()}`,
        content:
          evt.type === 'data-summary'
            ? evt.data?.label || 'Processing...'
            : evt.type === 'data-operation'
            ? `🔧 ${evt.data?.type}${evt.data?.ctx?.agent ? ` (${evt.data.ctx.agent})` : ''}`
            : evt.type === 'data-component'
            ? `Component: ${evt.data?.type}`
            : `Artifact: ${evt.data?.artifact_id}`,
        sender: 'system' as const,
        timestamp: evt.createdAt ? new Date(evt.createdAt) : new Date(),
        type: evt.type as any,
        data: evt.data,
      }))

    mapped = [...mapped, ...eventMessages]
    
    // Elevate collapsible call bubbles for each call
    let withCallBubbles = mapped
    if (callEvents && callEvents.length > 0) {
      const eventsByCall = new Map<string, any[]>()

      for (const ev of callEvents) {
        const key = ev.callId || `call-${ev._id || ev.id || ev.createdAt}`
        const list = eventsByCall.get(key) || []
        list.push(ev)
        eventsByCall.set(key, list)
      }

      const callBubbles = Array.from(eventsByCall.entries()).map(([callKey, events]) => {
        events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        const monitorEv = events.find(ev => ev.type === 'monitor')
        let monitor: { listenUrl?: string; controlUrl?: string } | undefined
        try { monitor = monitorEv?.content ? JSON.parse(monitorEv.content) : undefined } catch {}

        let ended = events.some(ev => (ev.type === 'lifecycle' && ev.status === 'ended') || (ev.type === 'status' && /ended/i.test(ev.status || '')))
        let recordingUrl: string | undefined
        let recordingMeta: any
        const recEv = events.find(ev => ev.type === 'recording')
        if (recEv?.content) {
          try {
            const obj = JSON.parse(recEv.content)
            recordingUrl = obj?.recordingUrl
            recordingMeta = obj
          } catch {}
        }

        const transcriptPairs: { user: string; system: string }[] = []
        let pendingUser: string | null = null
        const conversationEntries: TranscriptEntry[] = []
        const statusEntries: CallStatusEntry[] = []
        let hasStarted = false
        let hasError = false
        let statusCounter = 0
        let transcriptCounter = 0
        let finalTranscriptRaw: string | undefined
        let finalTranscriptEntries: TranscriptEntry[] | undefined
        let finalSummaryMarkdown: string | undefined
        let callOutcome: CallOutcomeInfo | undefined

        const toStatusLabel = (value: string | undefined) => {
          if (!value) return 'Status update'
          const trimmed = value.trim()
          if (!trimmed) return 'Status update'
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
        }

        for (const ev of events) {
          if (ev.type === 'transcript' && ev.content) {
            const roleLower = (ev.role || '').toLowerCase()
            if (roleLower === 'final') {
              finalTranscriptRaw = ev.content
              continue
            }
            if (roleLower === 'summary') {
              finalSummaryMarkdown = formatListMarkdown(ev.content)
              continue
            }
            if (roleLower === 'user') {
              if (pendingUser) transcriptPairs.push({ user: pendingUser, system: '' })
              pendingUser = ev.content
            } else {
              if (pendingUser) {
                transcriptPairs.push({ user: pendingUser, system: ev.content })
                pendingUser = null
              } else {
                transcriptPairs.push({ user: '', system: ev.content })
              }
            }

            const createdAt = new Date(ev.createdAt)
            const transcriptRole: 'user' | 'assistant' = roleLower === 'user' ? 'user' : 'assistant'
            const entryId = `${callKey}-line-${ev._id ?? transcriptCounter++}`
            conversationEntries.push({
              id: entryId,
              role: transcriptRole,
              content: ev.content,
              createdAt,
            })
            if (transcriptRole === 'assistant') {
              hasStarted = true
            }
          }

          if ((ev.type === 'status' || ev.type === 'lifecycle')) {
            const statusValue = typeof ev.status === 'string' && ev.status.trim().length > 0
              ? ev.status.trim()
              : (typeof ev.content === 'string' && ev.content.trim().length > 0 ? ev.content.trim() : ev.type)
            const markdownValue = formatListMarkdown(statusValue)
            const createdAt = new Date(ev.createdAt)
            const entryId = `${callKey}-status-${ev._id ?? statusCounter++}`
            const isSummaryEntry = /^summary\s*:/i.test(statusValue)

            const statusEntry: CallStatusEntry = {
              id: entryId,
              status: statusValue,
              label: toStatusLabel(statusValue),
              createdAt,
              type: ev.type === 'lifecycle' ? 'lifecycle' : 'status',
              markdown: markdownValue,
            }

            if (isSummaryEntry) {
              finalSummaryMarkdown = markdownValue
            }

            statusEntries.push(statusEntry)

            const outcomeMatch = statusValue.match(/result\s*[:\-]?\s*(.*)$/i)
            const rawOutcome = outcomeMatch?.[1] ?? ev.result ?? ev.output ?? ''
            if (!callOutcome) {
              const lower = `${statusValue} ${rawOutcome}`.toLowerCase()
              if (/(pass|success|resolved|completed)/i.test(lower)) {
                callOutcome = {
                  label: toStatusLabel(statusValue),
                  status: 'pass',
                  detail: markdownValue || rawOutcome?.trim(),
                }
              } else if (/(fail|failed|error|cancel)/i.test(lower)) {
                callOutcome = {
                  label: toStatusLabel(statusValue),
                  status: 'fail',
                  detail: markdownValue || rawOutcome?.trim(),
                }
              }
            }

            if (/error|fail|failed|hangup|cancel/i.test(statusValue)) {
              hasError = true
            }
            if (/start|progress|connected|live|speaking|answer/i.test(statusValue.toLowerCase())) {
              hasStarted = true
            }
            if (ev.type === 'lifecycle' && ev.status === 'started') {
              hasStarted = true
            }
          }
        }

        if (conversationEntries.length > 0) {
          hasStarted = true
        }
        if (pendingUser) transcriptPairs.push({ user: pendingUser, system: '' })

        const latestEvent = events[events.length - 1]
        const latestEventTime = latestEvent?.createdAt ? new Date(latestEvent.createdAt) : new Date()

        if (finalTranscriptRaw) {
          finalTranscriptEntries = parseFinalTranscript(finalTranscriptRaw, latestEventTime, String(callKey))
          if (finalTranscriptEntries.length > 0) {
            transcriptPairs.length = 0
            conversationEntries.splice(0, conversationEntries.length, ...finalTranscriptEntries)
            hasStarted = true
            ended = true
          }
        }
        const bubbleId = `call-bubble-${issueId}-${callKey}`

        const bubble: ChatMessage = {
          id: bubbleId,
          content: 'Live call transcript',
          sender: 'system',
          timestamp: latestEventTime,
          type: 'transcript',
        } as any

        if (transcriptPairs.length > 0) {
          bubble.transcript = transcriptPairs
        }
        if (conversationEntries.length > 0) {
          bubble.conversation = conversationEntries
        }
        if (monitor) (bubble as any).monitor = monitor
        if (ended) (bubble as any).isEnded = true
        if (recordingUrl) {
          (bubble as any).recordingUrl = recordingUrl
          if (recordingMeta) (bubble as any).recordingMeta = recordingMeta
        }

        bubble.callId = callKey
        if (statusEntries.length > 0) {
          bubble.statusLog = statusEntries
        }

        if (finalTranscriptEntries && finalTranscriptEntries.length > 0) {
          bubble.finalTranscript = finalTranscriptEntries
          bubble.finalTranscriptText = formatListMarkdown(finalTranscriptRaw)
        }

        if (finalSummaryMarkdown) {
          bubble.finalSummary = finalSummaryMarkdown
        }

        if (callOutcome) {
          bubble.callOutcome = callOutcome
          if (callOutcome.status === 'fail') {
            hasError = true
          }
        }

        const status: 'pending' | 'in_progress' | 'completed' | 'error' = hasError
          ? 'error'
          : ended
          ? 'completed'
          : hasStarted
          ? 'in_progress'
          : 'pending'

        const hasFinalTranscript = Boolean(finalTranscriptEntries && finalTranscriptEntries.length > 0)
        const latestStatus = statusEntries[statusEntries.length - 1]?.label
        const defaultStatusText = latestStatus ?? (
          status === 'completed'
            ? 'Call completed'
            : status === 'in_progress'
            ? 'Call in progress'
            : 'Waiting for call to begin'
        )
        bubble.status = status
        bubble.statusText = hasFinalTranscript ? 'Call finished' : defaultStatusText

        return bubble
      })

      const nonCallMessages = mapped.filter(m => !m.id.startsWith(`call-bubble-${issueId}`))
      withCallBubbles = [...nonCallMessages, ...callBubbles]
      withCallBubbles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }
    setMessages(withCallBubbles)
  }, [convexMessages, callEvents, issueId, streamingMessage, streamEvents])

  // Smoothly keep scroll pinned to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || aiLoading) return

    setAiLoading(true)
    setStreamEvents([]) // Clear previous stream events

    // Build full conversation history for the agent request
    const historyMessages = (convexMessages ?? []).map((row) => {
      const role = row.role === 'assistant' ? 'assistant'
        : row.role === 'user' ? 'user'
        : 'system'
      return {
        role,
        content: row.content,
      }
    })

    const outboundMessages = [...historyMessages, { role: 'user', content }]

    // Persist user message to Convex first
    try {
      await appendMessage({ issueId, role: 'user', content })
    } catch (error) {
      console.error('Failed to persist user message:', error)
    }

    // Mark issue as in-progress on first user message
    try {
      await updateIssueStatus({ id: issueId as any, status: 'in-progress' })
    } catch {}

    // Create abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Call /api/chat with SSE streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: outboundMessages,
          issueId,
          conversationId: issue?.chatId,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let buffer = ''
      let currentTextId: string | null = null
      let accumulatedText = ''
      
      // Initialize streaming message
      const tempMsgId = `temp-${Date.now()}`
      setStreamingMessage({
        id: tempMsgId,
        content: '',
        sender: 'system',
        timestamp: new Date(),
        type: 'text',
      })

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue // Skip empty lines and comments
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              console.log('✅ Stream complete')
              continue
            }

            try {
              const event = JSON.parse(data)
              console.log('📥 SSE Event:', event.type, event)
              
              // Store ALL events for display
              setStreamEvents(prev => [...prev, event])

              switch (event.type) {
                case 'text-start':
                  currentTextId = event.id
                  console.log('🔵 Text segment started:', event.id)
                  // Store conversationId if we don't have one
                  if (event.id && !issue?.chatId) {
                    await updateIssueChatId({ id: issueId as any, chatId: event.id })
                    console.log('✅ Stored conversationId:', event.id)
                  }
                  break

                case 'text-delta':
                  if (event.delta) {
                    // Append to accumulated text
                    accumulatedText += event.delta
                    // Update streaming message in real-time by appending to previous content
                    setStreamingMessage(prev => {
                      if (!prev) return null
                      return {
                        ...prev,
                        content: prev.content + event.delta,
                      }
                    })
                  }
                  break

                case 'text-end':
                  console.log('✅ Text segment ended. Total length:', accumulatedText.length)
                  break

                case 'data-summary':
                  console.log('🟡 Summary:', event.data?.label)
                  break

                case 'data-operation':
                  const opType = event.data?.type
                  if (!['agent_initializing', 'agent_ready'].includes(opType)) {
                    console.log('🔧 Operation:', opType, event.data?.ctx)
                  }
                  break

                case 'data-component':
                  console.log('🎨 Component:', event.data?.type, event.data)
                  break

                case 'data-artifact':
                  console.log('📦 Artifact:', event.data?.artifact_id, event.data)
                  break
                  
                case 'tool-call':
                case 'tool-result':
                  console.log('🛠️ MCP Tool:', event.type, event)
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', data, e)
            }
          }
        }
      }

      // Persist final message to Convex
      if (accumulatedText) {
        await appendMessage({
          issueId,
          role: 'assistant',
          content: accumulatedText,
        })
      }

      setStreamingMessage(null)
      setAiLoading(false)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('❌ Stream error:', error)
        await appendMessage({
          issueId,
          role: 'system',
          content: 'Sorry, I encountered an error. Please try again.',
        })
      }
      setStreamingMessage(null)
      setAiLoading(false)
    }
  }, [aiLoading, issueId, issue?.chatId, appendMessage, updateIssueStatus, updateIssueChatId, convexMessages])

  const resetChat = useCallback(() => {
    setMessages([])
    setIsIssueComplete(false)
  }, [])

  return {
    messages,
    isLoading: aiLoading,
    isIssueComplete,
    sendMessage,
    resetChat,
    streamEvents, // Expose all stream events for advanced UI
  }
}



