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
  type?: 'text' | 'system' | 'transcript' | 'status' | 'info' | 'data-summary' | 'data-operation' | 'data-component' | 'data-artifact' | 'tool-activity' | 'agent-header'
  data?: any // For data events
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
    result?: unknown
    error?: string
    timestamp: Date
  }>
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

const STREAM_EVENT_LIMIT = 200

function formatJsonPreview(value: any, maxLength = 160): string {
  if (value === null || value === undefined) return ''

  let asString: string
  try {
    if (typeof value === 'string') {
      asString = value.trim()
    } else {
      asString = JSON.stringify(value)
    }
  } catch {
    asString = String(value)
  }

  if (!asString) return ''
  return asString.length > maxLength ? `${asString.slice(0, maxLength)}…` : asString
}

function createToolEventMessage(evt: any): ChatMessage | null {
  if (!evt || typeof evt !== 'object') return null

  const timestamp = evt.createdAt ? new Date(evt.createdAt) : new Date()
  const baseId = evt.__localId ?? `${evt.type}-${timestamp.getTime()}-${Math.random()}`

  if (evt.type === 'tool-call') {
    const argPreview = evt.arguments ? formatJsonPreview(evt.arguments) : ''
    const content = `🛠️ Running ${evt.name}${argPreview ? ` → ${argPreview}` : ''}`
    return {
      id: baseId,
      content,
      sender: 'system',
      timestamp,
      type: 'status',
      data: evt,
    }
  }

  if (evt.type === 'tool-result') {
    const outputPreview = evt.output ? formatJsonPreview(evt.output) : ''
    const content = `✅ ${evt.name} finished${outputPreview ? ` → ${outputPreview}` : ''}`
    return {
      id: baseId,
      content,
      sender: 'system',
      timestamp,
      type: 'status',
      data: evt,
    }
  }

  if (evt.type === 'status') {
    // Hide main_agent_start and main_agent_end from UI
    const statusValue = typeof evt.status === 'string' ? evt.status : ''
    if (statusValue === 'main_agent_start' || statusValue === 'main_agent_end') {
      return null
    }

    const normalized = statusValue.replace(/_/g, ' ').trim()
    if (!normalized) return null

    const pretty = normalized.charAt(0).toUpperCase() + normalized.slice(1)
    const content = evt.metadata?.name ? `${pretty} (${evt.metadata.name})` : pretty

    return {
      id: baseId,
      content,
      sender: 'system',
      timestamp,
      type: 'status',
      data: evt,
    }
  }

  return null
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
  console.log('🎣 useChat hook called with issueId:', issueId)
  
  // Live messages from Convex
  const convexMessages = useQuery(api.orchestration.listMessages, issueId ? { issueId } : "skip") as any[] | undefined
  const callEvents = useQuery(api.orchestration.listCallEvents, issueId ? { issueId } : "skip") as any[] | undefined
  const convexToolCalls = useQuery(api.orchestration.listToolCalls, issueId ? { issueId } : "skip") as any[] | undefined
  const issue = useQuery(api.orchestration.getIssue, issueId ? { id: issueId as any } : "skip")
  const appendMessage = useMutation(api.orchestration.appendMessage)
  const updateIssueStatus = useMutation(api.orchestration.updateIssueStatus)
  const updateIssueChatId = useMutation(api.orchestration.updateIssueChatId)
  const createToolCall = useMutation(api.orchestration.createToolCall)
  const updateToolCallResult = useMutation(api.orchestration.updateToolCallResult)
  
  console.log('📡 Convex queries status:', {
    convexMessages: convexMessages === undefined ? 'loading' : `${convexMessages.length} items`,
    convexToolCalls: convexToolCalls === undefined ? 'loading' : `${convexToolCalls.length} items`,
    callEvents: callEvents === undefined ? 'loading' : `${callEvents.length} items`,
  })
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isIssueComplete, setIsIssueComplete] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Track loading state and streaming message
  const [aiLoading, setAiLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null)
  const [streamEvents, setStreamEvents] = useState<any[]>([]) // For status events only
  const [currentTurnNumber, setCurrentTurnNumber] = useState<number>(0) // Track conversation turn for grouping
  const [currentAgent, setCurrentAgent] = useState<string>('router') // Track current active agent
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages([])
    setIsIssueComplete(false)
    setStreamingMessage(null)
    setStreamEvents([])
    setCurrentTurnNumber(0)
    setCurrentAgent('router')
  }, [issueId])

  // Debug: Track convexToolCalls changes
  useEffect(() => {
    console.log('🔄 convexToolCalls changed:', {
      issueId,
      isUndefined: convexToolCalls === undefined,
      isArray: Array.isArray(convexToolCalls),
      length: convexToolCalls?.length,
      data: convexToolCalls,
    })
  }, [convexToolCalls, issueId])

  // Project Convex rows to ChatMessage shape and merge with streaming message
  useEffect(() => {
    if (!convexMessages) {
      console.log('⏳ Waiting for convexMessages to load...')
      return
    }
    
    console.log('🔍 Building messages:', {
      issueId,
      convexMessages: convexMessages?.length,
      convexToolCalls: convexToolCalls?.length,
      convexToolCallsIsUndefined: convexToolCalls === undefined,
      convexToolCallsIsArray: Array.isArray(convexToolCalls),
      toolCallSample: convexToolCalls?.[0],
      allToolCalls: convexToolCalls,
    })
    
    // PHASE 1: Core messages from Convex
    let mapped: ChatMessage[] = convexMessages.map((row) => ({
      id: row._id,
      content: row.content,
      sender: row.role === 'user' ? 'user' : 'system',
      timestamp: new Date(row.createdAt),
      type: row.role === 'system' ? 'system' : 'text',
    }))
    
    // PHASE 2: Tool calls from Convex (automatically reactive!)
    // Just display what's in Convex, period. No complex deduplication logic.
    const sortedToolCalls = (convexToolCalls ?? [])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    console.log('🛠️ Sorted tool calls:', sortedToolCalls.length, sortedToolCalls)
    
    // Group by turnNumber if available
    const groupsByTurn = new Map<number | string, Array<{
      id: string
      name: string
      arguments: Record<string, unknown>
      result?: unknown
      error?: string
      timestamp: Date
    }>>()
    
    for (const tc of sortedToolCalls) {
      const timestamp = new Date(tc.createdAt)
      const groupKey = tc.turnNumber !== undefined && tc.turnNumber !== null 
        ? tc.turnNumber 
        : `time-${Math.floor(timestamp.getTime() / (2 * 60 * 1000))}`
      
      if (!groupsByTurn.has(groupKey)) {
        groupsByTurn.set(groupKey, [])
      }
      
      groupsByTurn.get(groupKey)!.push({
        id: tc.toolCallId,
        name: tc.name,
        arguments: tc.arguments || {},
        result: tc.result,
        error: tc.error,
        timestamp,
      })
    }
    
    // Create tool activity messages for each group
    const toolActivityMessages: ChatMessage[] = []
    for (const [_, toolCalls] of groupsByTurn.entries()) {
      if (toolCalls.length > 0) {
        const earliestTimestamp = toolCalls[0].timestamp
        toolActivityMessages.push({
          id: `tool-activity-${issueId}-${earliestTimestamp.getTime()}`,
          content: 'Tool activity',
          sender: 'system',
          timestamp: earliestTimestamp,
          type: 'tool-activity',
          toolCalls,
        })
      }
    }
    
    console.log('📦 Tool activity messages created:', toolActivityMessages.length, toolActivityMessages)
    
    mapped = [...mapped, ...toolActivityMessages]
    
    // PHASE 3: Add active streaming message if present
    if (streamingMessage) {
      mapped = [...mapped, streamingMessage]
    }
    
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
    
    // PHASE 4: Final sort by timestamp
    withCallBubbles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    setMessages(withCallBubbles)
  }, [convexMessages, callEvents, convexToolCalls, issueId, streamingMessage])

  // Smoothly keep scroll pinned to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || aiLoading) return

    setAiLoading(true)
    setStreamEvents([]) // Clear previous stream events
    
    // Increment turn number for this conversation turn
    const turnNumber = currentTurnNumber + 1
    setCurrentTurnNumber(turnNumber)

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

      const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''

      if (!contentType.includes('text/event-stream')) {
        const rawText = await response.text()
        let assistantText = ''
        if (rawText) {
          try {
            const parsed = JSON.parse(rawText)
            assistantText = parsed?.output ?? parsed?.message ?? parsed?.data?.output ?? ''
            if (!assistantText && typeof parsed === 'string') {
              assistantText = parsed
            } else if (!assistantText && typeof parsed === 'object') {
              assistantText = JSON.stringify(parsed)
            }
          } catch (err) {
            assistantText = rawText
          }
        }

        if (assistantText.trim().length > 0) {
          await appendMessage({
            issueId,
            role: 'assistant',
            content: assistantText,
          })
        }

        setStreamingMessage(null)
        setAiLoading(false)
        return
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

      let finalState: any = null

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

              const enrichedEvent = {
                ...event,
                createdAt: event.createdAt ?? new Date().toISOString(),
                __localId:
                  event.__localId ??
                  (event.id ? `${event.type}-${event.id}` : `${event.type}-${Date.now()}-${Math.random()}`),
              }

              setStreamEvents(prev => {
                const next = [...prev, enrichedEvent]
                if (next.length > STREAM_EVENT_LIMIT) {
                  next.splice(0, next.length - STREAM_EVENT_LIMIT)
                }
                return next
              })

              switch (event.type) {
                case 'agent-header': {
                  // Just track the current agent, no message needed
                  console.log('🎭 Agent switch:', event.agent, event.displayName)
                  setCurrentAgent(event.agent || 'router')
                  break
                }

                case 'text-start': {
                  currentTextId = event.id
                  if (event.id && !issue?.chatId) {
                    await updateIssueChatId({ id: issueId as any, chatId: event.id })
                  }
                  setStreamingMessage({
                    id: `temp-${Date.now()}`,
                    content: '',
                    sender: 'system',
                    timestamp: new Date(),
                    type: 'text',
                  })
                  break
                }

                case 'text-delta': {
                  if (typeof event.delta === 'string') {
                    accumulatedText += event.delta
                    setStreamingMessage(prev => {
                      if (!prev) return null
                      return {
                        ...prev,
                        content: prev.content + event.delta,
                      }
                    })
                  }
                  break
                }

                case 'text-end':
                  console.log('✅ Text segment ended. Total length:', accumulatedText.length)
                  break

                case 'status':
                  console.log('📣 Status:', event.status)
                  break

                case 'tool-call':
                  console.log('🛠️ Tool call:', event.name, event.arguments)
                  // Persist tool call to Convex - Convex will handle deduplication
                  try {
                    console.log('💾 Attempting to save tool call to Convex:', {
                      issueId,
                      toolCallId: event.id,
                      name: event.name,
                      turnNumber: currentTurnNumber,
                      agentType: event.metadata?.agentType,
                    })
                    const result = await createToolCall({
                      issueId,
                      toolCallId: event.id,
                      name: event.name,
                      arguments: event.arguments || {},
                      turnNumber: currentTurnNumber,
                      agentType: event.metadata?.agentType,
                    })
                    console.log('✅ Tool call saved to Convex successfully:', result)
                  } catch (err) {
                    console.error('❌ Failed to persist tool call:', err)
                  }
                  break

                case 'tool-result':
                  console.log('🛠️ Tool result:', event.name, event.output)
                  // Update tool call with result
                  try {
                    await updateToolCallResult({
                      toolCallId: event.id,
                      result: event.output?.error ? undefined : event.output,
                      error: event.output?.error ? (typeof event.output.error === 'string' ? event.output.error : JSON.stringify(event.output.error)) : undefined,
                    })
                  } catch (err) {
                    console.error('Failed to update tool call result:', err)
                  }
                  break

                case 'final':
                  finalState = event.state
                  if (!accumulatedText && finalState?.messages) {
                    const lastAssistant = [...(finalState.messages as any[])].reverse().find((m) => m.role === 'assistant' && typeof m.content === 'string')
                    if (lastAssistant) {
                      accumulatedText = lastAssistant.content
                    }
                  }
                  if (event.state?.status === 'completed') {
                    setIsIssueComplete(true)
                  }
                  break

                default:
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', data, e)
            }
          }
        }
      }

      // Persist final message to Convex
      if (accumulatedText.trim().length > 0) {
        await appendMessage({
          issueId,
          role: 'assistant',
          content: accumulatedText,
        })
      }

      setStreamingMessage(null)
      setAiLoading(false)
      setStreamEvents([]) // Clear stream events - Convex reactivity will show persisted data

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
  }, [aiLoading, issueId, issue?.chatId, appendMessage, updateIssueStatus, updateIssueChatId, convexMessages, currentTurnNumber, createToolCall, updateToolCallResult])

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
    currentAgent, // Expose current active agent for UI indicator
  }
}



