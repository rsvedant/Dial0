import { NextRequest } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { getToken } from '@/lib/auth-server'
import { runOrchestrator } from '@/lib/langgraph/orchestrator'
import type { NormalizedMessage } from '@/lib/langgraph/orchestrator'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, issueId } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const allowedRoles: NormalizedMessage['role'][] = ['user', 'assistant', 'system', 'tool']
    const normalizedMessages: NormalizedMessage[] = messages
      .filter((msg: any) => msg && typeof msg === 'object' && typeof msg.content === 'string')
      .map((msg: any) => {
        const candidateRole = typeof msg.role === 'string' ? msg.role.toLowerCase() : ''
        const role = (allowedRoles.includes(candidateRole as NormalizedMessage['role'])
          ? candidateRole
          : 'user') as NormalizedMessage['role']
        return {
          id: typeof msg.id === 'string' ? msg.id : randomUUID(),
          role,
          content: msg.content,
          name: typeof msg.name === 'string' ? msg.name : undefined,
        }
      })
    
    if (normalizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid messages found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const lastUserMessage = [...normalizedMessages]
      .reverse()
      .find((msg) => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim().length > 0)

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user settings and issue data from Convex
    const token = await getToken()
    let settings: any = null
    let issue: any = null
    
    if (token) {
      try {
        settings = await fetchQuery(api.orchestration.getSettings, {}, { token })
      } catch (e) {
        console.warn('Failed to fetch settings from Convex:', e)
      }
      
      // Fetch issue to get currentAgent
      if (issueId) {
        try {
          issue = await fetchQuery(api.orchestration.getIssue, { id: issueId as any }, { token })
        } catch (e) {
          console.warn('Failed to fetch issue from Convex:', e)
        }
      }
    }
    const incomingRequestContext = typeof body.requestContext === 'object' && body.requestContext !== null ? body.requestContext : {}
    const baseContext = {
      name: settings?.firstName && settings?.lastName ? `${settings.firstName} ${settings.lastName}` : '',
      email: settings?.email ?? '',
      phone: settings?.phone ?? '',
      timezone: settings?.timezone ?? '',
      address: settings?.address ? (typeof settings.address === 'string' ? settings.address : JSON.stringify(settings.address)) : '',
    }

    const requestContext = {
      name: incomingRequestContext.name ?? baseContext.name,
      email: incomingRequestContext.email ?? baseContext.email,
      phone: incomingRequestContext.phone ?? baseContext.phone,
      timezone: incomingRequestContext.timezone ?? baseContext.timezone,
      address: incomingRequestContext.address ?? baseContext.address,
    }

    const incomingSecrets = typeof body.sharedSecrets === 'object' && body.sharedSecrets !== null ? body.sharedSecrets : {}
    const sharedSecrets = {
      issueId: typeof issueId === 'string' ? issueId : (typeof incomingSecrets.issueId === 'string' ? incomingSecrets.issueId : null),
      authToken: token ?? (typeof incomingSecrets.authToken === 'string' ? incomingSecrets.authToken : null),
      // CRITICAL: Pass settings so start_call can enrich context
      settings: settings ? {
        firstName: settings.firstName,
        lastName: settings.lastName,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        timezone: settings.timezone,
        birthdate: settings.birthdate,
        voiceId: settings.voiceId,
        selectedVoice: settings.selectedVoice,
        testModeEnabled: settings.testModeEnabled,
        testModeNumber: settings.testModeNumber,
      } : undefined,
    }

    console.log('Running LangGraph orchestrator:', {
      issueId: sharedSecrets.issueId,
      messageCount: normalizedMessages.length,
      hasSettings: !!settings,
      settingsFields: settings ? Object.keys(settings).filter(k => settings[k] !== undefined) : [],
      currentAgent: issue?.currentAgent || 'none',
    })

    const encoder = new TextEncoder()
    const orchestrator = runOrchestrator({
      messages: normalizedMessages,
      requestContext,
      sharedSecrets,
      currentAgent: issue?.currentAgent, // Pass persisted agent from database
    })

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Event buffering for smoother UI updates
          let eventBuffer: any[] = []
          let flushTimeout: NodeJS.Timeout | null = null
          
          const flushBuffer = () => {
            if (eventBuffer.length === 0) return
            
            // Send all buffered events at once
            for (const event of eventBuffer) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            }
            eventBuffer = []
            flushTimeout = null
          }
          
          const scheduleFlush = () => {
            if (flushTimeout) return // Already scheduled
            flushTimeout = setTimeout(flushBuffer, 16) // ~60fps
          }
          
          for await (const event of orchestrator) {
            // Handle agent switch - persist to database
            if (event.type === 'agent-switch' && issueId) {
              try {
                await fetchMutation(
                  api.orchestration.updateIssueAgent,
                  { id: issueId, currentAgent: event.to },
                  { token }
                );
                console.log(`[Agent Persistence] Updated issue ${issueId} to agent: ${event.to}`);
              } catch (error) {
                console.error('[Agent Persistence] Failed to update agent:', error);
                // Don't throw - continue streaming even if persistence fails
              }
            }
            
            // Buffer text-delta events for smoother rendering
            if (event.type === 'text-delta') {
              eventBuffer.push(event)
              scheduleFlush()
            } else {
              // Flush buffer before sending non-delta events
              if (eventBuffer.length > 0) {
                flushBuffer()
              }
              // Send important events immediately
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            }
          }
          
          // Final flush
          if (eventBuffer.length > 0) {
            flushBuffer()
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Orchestrator stream error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
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



