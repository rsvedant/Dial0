import { NextRequest } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { getToken } from '@/lib/auth-server'

const AGENT_BASE_URL = process.env.AGENT_BASE_URL!
const AGENT_API_KEY = process.env.AGENT_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, issueId, conversationId } = body

    if (!AGENT_BASE_URL || !AGENT_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Agent configuration missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user settings from Convex for context headers
    const token = await getToken()
    let settings: any = null
    let storedChatId: string | null = null
    
    if (token) {
      try {
        settings = await fetchQuery(api.orchestration.getSettings, {}, { token })
      } catch (e) {
        console.warn('Failed to fetch settings from Convex:', e)
      }
      
      // Get stored conversationId from issue if it exists
      if (issueId) {
        try {
          const issue = await fetchQuery(api.orchestration.getIssue, { id: issueId }, { token })
          storedChatId = issue?.chatId || null
        } catch (e) {
          console.warn('Failed to fetch issue conversationId:', e)
        }
      }
    }

    // Build headers as per agent requirements
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    headers['Authorization'] = `Bearer ${AGENT_API_KEY}`

    // Pass settings as context headers (as per agent docs)
    if (settings) {
      if (settings.firstName && settings.lastName) {
        headers['name'] = settings.firstName + ' ' + settings.lastName
      }
      if (settings.email) headers['email'] = settings.email
      if (settings.phone) headers['phone'] = settings.phone
      if (settings.timezone) headers['timezone'] = settings.timezone
      if (settings.address) headers['address'] = JSON.stringify(settings.address)
    }

    // Pass issueId as metadata
    if (issueId) {
      headers['issueid'] = issueId
    }

    // Pass auth token as a header if available
    if (token) {
      headers['authtoken'] = token
    }

    // Use stored conversationId or the one from request
    const activeConversationId = storedChatId || conversationId

    console.log('Proxying to agent:', {
      url: `${AGENT_BASE_URL}/api/chat`,
      issueId,
      conversationId: activeConversationId,
      messageCount: messages?.length ?? 0,
      hasSettings: !!settings,
    })

    // Build request body with full message history and conversationId if available
    const requestBody: any = { 
      messages
    }
    if (activeConversationId) {
      requestBody.conversationId = activeConversationId
    }

    // Forward request to agent
    const agentResponse = await fetch(`${AGENT_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.error('Agent error:', errorText)
      return new Response(
        JSON.stringify({ error: `Agent error: ${errorText}` }),
        { status: agentResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Agent response headers:', {
      contentType: agentResponse.headers.get('Content-Type'),
      status: agentResponse.status,
    })

    // Stream the response back to the client
    // This passes through all streaming data including tool calls, thinking, etc.
    return new Response(agentResponse.body, {
      status: 200,
      headers: {
        'Content-Type': agentResponse.headers.get('Content-Type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: `Failed to process chat: ${String(error)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}



