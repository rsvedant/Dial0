import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'system'
  timestamp: Date
  type?: 'text' | 'system' | 'transcript' | 'status' | 'info' | 'data-summary' | 'data-operation' | 'data-component' | 'data-artifact'
  data?: any // For data events
}

interface UseChatOptions {
  issueId: string
  onIssueComplete?: (issueDetails: string) => void
  knownContext?: any
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
    const eventMessages: ChatMessage[] = streamEvents
      .filter(evt => {
        if (!['data-summary', 'data-operation', 'data-component', 'data-artifact'].includes(evt.type)) {
          return false
        }
        // Hide noisy operation events
        if (evt.type === 'data-operation') {
          const opType = evt.data?.type
          if (['agent_initializing', 'agent_ready', 'completion'].includes(opType)) {
            return false // Don't show initialization noise and completion events
          }
        }
        return true
      })
      .map(evt => ({
        id: `evt-${Date.now()}-${Math.random()}`,
        content: evt.type === 'data-summary' 
          ? evt.data?.label || 'Processing...'
          : evt.type === 'data-operation'
          ? `🔧 ${evt.data?.type}${evt.data?.ctx?.agent ? ` (${evt.data.ctx.agent})` : ''}`
          : evt.type === 'data-component'
          ? `Component: ${evt.data?.type}`
          : `Artifact: ${evt.data?.artifact_id}`,
        sender: 'system' as const,
        timestamp: new Date(),
        type: evt.type as any,
        data: evt.data,
      }))
    
    mapped = [...mapped, ...eventMessages]
    
    // Elevate a single collapsible "call bubble" from call events, if any exist
    let withCallBubble = mapped
    if (callEvents && callEvents.length > 0) {
      const eventsWithCallId = callEvents.filter((ev) => ev.callId)
      const latestCallId = eventsWithCallId.length > 0 ? eventsWithCallId[eventsWithCallId.length - 1].callId : null
      const relevantEvents = latestCallId ? callEvents.filter((ev) => ev.callId === latestCallId) : callEvents

      // Extract monitor URLs if present
      const monitorEv = relevantEvents.find(ev => ev.type === 'monitor')
      let monitor: { listenUrl?: string; controlUrl?: string } | undefined
      try { monitor = monitorEv?.content ? JSON.parse(monitorEv.content) : undefined } catch {}
      
      // Determine if call ended and extract recordingUrl
      const ended = relevantEvents.some(ev => (ev.type === 'lifecycle' && ev.status === 'ended') || (ev.type === 'status' && /ended/i.test(ev.status || '')))
      let recordingUrl: string | undefined
      let recordingMeta: any
      const recEv = relevantEvents.find(ev => ev.type === 'recording')
      if (recEv?.content) {
        try {
          const obj = JSON.parse(recEv.content)
          recordingUrl = obj?.recordingUrl
          recordingMeta = obj
        } catch {}
      }
      
      const transcriptPairs: { user: string; system: string }[] = []
      let pendingUser: string | null = null
      
      // Collapse events into paired turns
      for (const ev of relevantEvents) {
        if (ev.type === 'transcript' && ev.content) {
          if ((ev.role || '').toLowerCase() === 'user') {
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
        }
      }
      if (pendingUser) transcriptPairs.push({ user: pendingUser, system: '' })

      const latestEventTime = new Date(relevantEvents[relevantEvents.length - 1].createdAt)
      const bubble: ChatMessage = {
        id: 'call-bubble-' + issueId,
        content: 'Live call transcript',
        sender: 'system',
        timestamp: latestEventTime,
        type: 'transcript',
      } as any
      ;(bubble as any).transcript = transcriptPairs
      if (monitor) (bubble as any).monitor = monitor
      if (ended) (bubble as any).isEnded = true
      if (recordingUrl) {
        (bubble as any).recordingUrl = recordingUrl
        if (recordingMeta) (bubble as any).recordingMeta = recordingMeta
      }

      // Insert/replace a single bubble at the end
      withCallBubble = [...mapped.filter(m => m.id !== bubble.id), bubble]
    }
    setMessages(withCallBubble)
  }, [convexMessages, callEvents, issueId, streamingMessage, streamEvents])

  // Smoothly keep scroll pinned to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || aiLoading) return

    setAiLoading(true)
    setStreamEvents([]) // Clear previous stream events

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
          messages: [{ role: 'user', content }],
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
  }, [aiLoading, issueId, issue?.chatId, appendMessage, updateIssueStatus, updateIssueChatId])

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



