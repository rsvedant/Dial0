import { useState, useCallback, useEffect, useRef } from 'react'
import { useConvex, useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'system'
  timestamp: Date
  type?: 'text' | 'system' | 'transcript' | 'status' | 'info'
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
  const appendMessage = useMutation(api.orchestration.appendMessage)
  const updateIssueStatus = useMutation(api.orchestration.updateIssueStatus)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isIssueComplete, setIsIssueComplete] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Project Convex rows to ChatMessage shape
  useEffect(() => {
    if (!convexMessages) return
    const mapped: ChatMessage[] = convexMessages.map((row) => ({
      id: row._id, // Convex doc id
      content: row.content,
      sender: row.role === 'user' ? 'user' : 'system',
      timestamp: new Date(row.createdAt),
      type: row.role === 'system' ? 'system' : 'text',
    }))
    // Elevate a single collapsible "call bubble" from call events, if any exist
    let withCallBubble = mapped
    if (callEvents && callEvents.length > 0) {
      // Extract monitor URLs if present
      const monitorEv = callEvents.find(ev => ev.type === 'monitor')
      let monitor: { listenUrl?: string; controlUrl?: string } | undefined
      try { monitor = monitorEv?.content ? JSON.parse(monitorEv.content) : undefined } catch {}
      // Determine if call ended and extract recordingUrl (from our webhook end-of-call-report)
      const ended = callEvents.some(ev => (ev.type === 'lifecycle' && ev.status === 'ended') || (ev.type === 'status' && /ended/i.test(ev.status || '')))
      let recordingUrl: string | undefined
      let recordingMeta: any
      const recEv = callEvents.find(ev => ev.type === 'recording')
      if (recEv?.content) {
        try {
          const obj = JSON.parse(recEv.content)
          recordingUrl = obj?.recordingUrl
          recordingMeta = obj
        } catch {}
      }
      const transcriptPairs: { user: string; system: string }[] = []
      let pendingUser: string | null = null
      // Collapse events into paired turns (rough approximation)
      for (const ev of callEvents) {
        if (ev.type === 'transcript' && ev.content) {
          if ((ev.role || '').toLowerCase() === 'user') {
            // flush any previous unmatched user turn
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

      const latestEventTime = new Date(callEvents[callEvents.length - 1].createdAt)
      const bubble: ChatMessage = {
        id: 'call-bubble-' + issueId,
        content: 'Live call transcript',
        sender: 'system',
        timestamp: latestEventTime,
        type: 'transcript',
      } as any
      ;(bubble as any).transcript = transcriptPairs
      if (monitor) {
        (bubble as any).monitor = monitor
      }
      if (ended) {
        (bubble as any).isEnded = true
      }
      if (recordingUrl) {
        (bubble as any).recordingUrl = recordingUrl
        if (recordingMeta) (bubble as any).recordingMeta = recordingMeta
      }

      // Insert/replace a single bubble at the end
      withCallBubble = [...mapped.filter(m => m.id !== bubble.id), bubble]
    }
    setMessages(withCallBubble)
  }, [convexMessages, callEvents, issueId])

  // Smoothly keep scroll pinned to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Persist user message first to Convex, UI reflects via live query
    await appendMessage({ issueId, role: 'user', content })
    // Mark issue as in-progress on first user message in this session
    try {
      await updateIssueStatus({ id: issueId as any, status: 'in-progress' })
    } catch {}
    setIsLoading(true)

    try {
      // Build full message history and append the new user turn
      const history = [...(messages || []), { role: 'user', content }]
        .map((msg: any) => ({
          role: msg.role ? (msg.role === 'user' ? 'user' : 'assistant') : (msg.sender === 'user' ? 'user' : 'assistant'),
          content: (msg.content || '')
        }))

      // Send to Gemini intake API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: history,
          issueId,
          knownContext: knownContext ?? {
            user: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
            },
          },
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Check if issue understanding is complete
      if (data.isComplete) {
        setIsIssueComplete(true)

        // Use server-normalized issueDetails when available
        const issueDetails: string = data.issueDetails || data.message.replace(/^.*ISSUE_COMPLETE\s*:\s*/i, '')

        // Persist a system acknowledgment message; UI updates via query
        await appendMessage({
          issueId,
          role: 'system',
          content: 'Okay — we\'re working on resolving your issue by calling up the service now. I\'ll prepare the call context and keep you posted.'
        })

        // Intake no longer shows grounded sources; routing step will include citations

        // Send to routing agent
        await handleInkeepIntegration(issueDetails)

        // Do NOT mark the issue resolved here. Resolution should only occur
        // after the voice call ends (handled by the Vapi webhook handler).
        onIssueComplete?.(issueDetails)
      } else {
        // Don't persist empty responses
        if (data.message && data.message.trim()) {
          await appendMessage({ issueId, role: 'assistant', content: data.message })
        } else {
          console.error('Received empty message from API:', data)
          await appendMessage({ issueId, role: 'system', content: 'I had trouble generating a response. Could you please try rephrasing your question?' })
        }

        // Chat intake no longer surfaces sources; routing will provide citations if needed
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Check if it's a 429 error
      const errorMsg = String(error)
      if (errorMsg.includes('429')) {
        await appendMessage({ issueId, role: 'system', content: '⚠️ Rate limited by Gemini API. Please wait a moment before trying again.' })
      } else {
        await appendMessage({ issueId, role: 'system', content: 'Sorry, I encountered an error. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, issueId, onIssueComplete])

  const handleInkeepIntegration = async (issueDetails: string) => {
    try {
      const response = await fetch('/api/inkeep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueDetails,
          userQuery: messages[0]?.content || 'User issue',
          issueId,
          knownContext,
        })
      })

      const data = await response.json()

      if (data.success) {
        // Print built routing context to the browser console, as requested
        console.log('Inkeep routing context (client):', data.context)

        await appendMessage({
          issueId,
          role: 'system',
          content:
            `✅ Routing context prepared for voice agent.\n` +
            `• Purpose: ${data.context?.callPurpose || 'N/A'}\n` +
            `• Contact: ${data.context?.contact?.name || 'Unknown'} (${data.context?.contact?.type || 'service'})` +
            `${data.context?.contact?.phoneNumber ? `\n• Phone: ${data.context.contact.phoneNumber}` : ''}`,
        })

        // Show next steps (if any)
        const nextSteps: string[] = data.context?.followUp?.nextSteps || []
        if (Array.isArray(nextSteps) && nextSteps.length > 0) {
          await appendMessage({
            issueId,
            role: 'system',
            content: `Next steps:\n${nextSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`,
          })
        }
        const notify: string[] = data.context?.followUp?.notify || []
        if (Array.isArray(notify) && notify.length > 0) {
          await appendMessage({
            issueId,
            role: 'system',
            content: `We will notify: ${notify.join(', ')}`,
          })
        }

        if (data.settingsApplied && Array.isArray(data.settingsUsedKeys)) {
          await appendMessage({
            issueId,
            role: 'system',
            content: `Applied profile settings to call prep: ${data.settingsUsedKeys.join(', ')}`,
          })
        }

        // Server-side Inkeep route triggers Vapi call; skip duplicate client call
      }
    } catch (error) {
      console.error('Inkeep integration failed:', error)
    }
  }

  const resetChat = useCallback(() => {
    setMessages([])
    setIsIssueComplete(false)
  }, [])

  return {
    messages,
    isLoading,
    isIssueComplete,
    sendMessage,
    resetChat
  }
}



