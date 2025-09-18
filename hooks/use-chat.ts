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
}

export function useChat({ issueId, onIssueComplete }: UseChatOptions) {
  // Live messages from Convex
  const convexMessages = useQuery(api.orchestration.listMessages, issueId ? { issueId } : undefined) as any[] | undefined
  const appendMessage = useMutation(api.orchestration.appendMessage)
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
    setMessages(mapped)
  }, [convexMessages])

  // Smoothly keep scroll pinned to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Persist user message first to Convex, UI reflects via live query
    await appendMessage({ issueId, role: 'user', content })
    setIsLoading(true)

    try {
      // Send to Gemini API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(messages || []), { role: 'user', content }].map(msg => ({
            role: (msg as any).role ?? (msg.sender === 'user' ? 'user' : 'assistant'),
            content: (msg as any).content ?? msg.content
          })),
          issueId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Check if issue understanding is complete
      if (data.isComplete) {
        setIsIssueComplete(true)

        // Extract issue details and send to Inkeep
        const issueDetails = data.message.replace('ISSUE_COMPLETE: ', '')

        // Persist a system acknowledgment message; UI updates via query
        await appendMessage({
          issueId,
          role: 'system',
          content: 'Perfect! I have all the information I need. Building call context...'
        })

        // Send to routing agent
        await handleInkeepIntegration(issueDetails)

        onIssueComplete?.(issueDetails)
      } else {
        // Persist AI response
        await appendMessage({ issueId, role: 'assistant', content: data.message })
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      
      await appendMessage({ issueId, role: 'system', content: 'Sorry, I encountered an error. Please try again.' })
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

