import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema validation for context (same as start-call route)
const contextSchema = z.object({
  callPurpose: z.string().optional(),
  callType: z.enum(['customer_service', 'personal', 'work', 'general']).optional(),
  goal: z.object({
    summary: z.string().optional(),
  }).optional(),
  objective: z.string().optional(),
  contact: z.object({
    type: z.string(),
    name: z.string(),
    phoneNumber: z.string().optional(),
    altChannels: z.array(z.string()).optional(),
  }),
  issue: z.object({
    category: z.string().optional(),
    summary: z.string().optional(),
    details: z.string().optional(),
    urgency: z.string().optional(),
    desiredOutcome: z.string().optional(),
  }).optional(),
  constraints: z.array(z.string()).optional(),
  verification: z.array(z.string()).optional(),
  availability: z.object({
    timezone: z.string().optional(),
    preferredWindows: z.array(z.string()).optional(),
  }).optional(),
  caller: z.object({
    name: z.string(),
    callback: z.string().optional(),
    identifiers: z.array(z.string()).optional(),
    org: z.string().optional(),
    employer: z.string().optional(),
  }),
  followUp: z.object({
    nextSteps: z.array(z.string()).optional(),
    notify: z.array(z.string()).optional(),
  }).optional(),
  notesForAgent: z.string().optional(),
  work: z.object({
    org: z.string().optional(),
  }).optional(),
  openers: z.object({
    personal: z.string().optional(),
    work: z.string().optional(),
    general: z.string().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jsonrpc, id, method, params } = body

    // Handle initialize request (MCP handshake)
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'dial0-mcp-server',
            version: '1.0.0',
          },
        },
      })
    }

    // Handle initialized notification (no response needed)
    if (method === 'notifications/initialized') {
      return new Response(null, { status: 200 })
    }

    // Handle list_tools request
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
          {
            name: 'start_call',
            description: 'Initiate a phone call via Vapi with full context. Requires issueId, authToken, and validated context.',
            inputSchema: {
              type: 'object',
              properties: {
                issueId: {
                  type: 'string',
                  description: 'The issue ID to associate with this call',
                },
                authToken: {
                  type: 'string',
                  description: 'Authentication token for the user',
                },
                context: {
                  type: 'object',
                  description: 'Full call context with caller info, contact details, issue details, etc.',
                  properties: {
                    callPurpose: {
                      type: 'string',
                      description: 'Brief description of why the call is being made',
                    },
                    callType: {
                      type: 'string',
                      enum: ['customer_service', 'personal', 'work', 'general'],
                    },
                    contact: {
                      type: 'object',
                      required: ['type', 'name'],
                      properties: {
                        type: { type: 'string' },
                        name: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        altChannels: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    issue: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        summary: { type: 'string' },
                        details: { type: 'string' },
                        urgency: { type: 'string' },
                        desiredOutcome: { type: 'string' },
                      },
                    },
                    caller: {
                      type: 'object',
                      required: ['name'],
                      properties: {
                        name: { type: 'string' },
                        callback: { type: 'string' },
                        identifiers: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    verification: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    availability: {
                      type: 'object',
                      properties: {
                        timezone: { type: 'string' },
                        preferredWindows: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    followUp: {
                      type: 'object',
                      properties: {
                        nextSteps: { type: 'array', items: { type: 'string' } },
                        notify: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    notesForAgent: { type: 'string' },
                  },
                  required: ['contact', 'caller'],
                },
              },
              required: ['issueId', 'authToken', 'context'],
            },
          },
        ],
        },
      })
    }

    // Handle call_tool request
    if (method === 'tools/call') {
      const { name, arguments: args } = params

      if (name === 'start_call') {
        const { issueId, authToken, context } = args

        // Validate context
        try {
          contextSchema.parse(context)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32602,
                  message: 'Invalid context schema',
                  data: error.errors,
                },
              },
              { status: 400 }
            )
          }
        }

        const response = await fetch(`${process.env.SITE_URL}/api/vapi/start-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'issueId': issueId,
            'authToken': authToken,
          },
          body: JSON.stringify({ context }),
        })

        const data = await response.json()
        if (!response.ok) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: data.error || 'Failed to start call',
              data: data.details,
            },
          })
        }

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Call started successfully!\n\nCall ID: ${data.call?.id || 'N/A'}\nStatus: ${data.call?.status || 'initiated'}\n\n${data.systemPromptPreview ? `System Prompt Preview:\n${data.systemPromptPreview.slice(0, 500)}...` : ''}`,
              },
            ],
          },
        })
      }

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${name}`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown method: ${method}`,
        },
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('MCP endpoint error:', error)
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
        },
      },
      { status: 500 }
    )
  }
}
