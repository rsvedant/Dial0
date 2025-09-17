import { useState, useCallback } from 'react'

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isIssueComplete, setIsIssueComplete] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Send to Gemini API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
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
        
        // Add completion message
        const completionMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: 'Perfect! I have all the information I need. Let me connect you with our documentation system and the right person to help you.',
          sender: 'system',
          timestamp: new Date(),
          type: 'status'
        }

        setMessages(prev => [...prev, completionMessage])

        // Send to Inkeep
        await handleInkeepIntegration(issueDetails)
        
        onIssueComplete?.(issueDetails)
      } else {
        // Add AI response
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.message,
          sender: 'system',
          timestamp: new Date(),
          type: 'text'
        }

        setMessages(prev => [...prev, aiMessage])
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'system',
        timestamp: new Date(),
        type: 'system'
      }

      setMessages(prev => [...prev, errorMessage])
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
          userQuery: messages[0]?.content || 'User issue'
        })
      })

      const data = await response.json()

      if (data.success) {
        const inkeepMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          content: `✅ ${data.message}\n\n📞 Expected response time: ${data.estimatedResponseTime}`,
          sender: 'system',
          timestamp: new Date(),
          type: 'info'
        }

        setMessages(prev => [...prev, inkeepMessage])
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

