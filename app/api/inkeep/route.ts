import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'
import { z } from 'zod'

// Simple server-side Convex HTTP client if URL is present
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

// Routing agent: builds VAPI-ready context from a finalized Gemini transcript
const SYSTEM_ROUTER_PROMPT = `You are a routing and orchestration agent. Given a finalized chat transcript that identified a user's issue, build a precise, actionable call context for a downstream voice agent (VAPI) to place a phone call to a person/business/service.

Output STRICT JSON ONLY with this schema (no prose):
{
  "callPurpose": string,
  "contact": {
    "type": "person" | "business" | "service",
    "name": string,
    "phoneNumber": string | null,
    "altChannels": string[]
  },
  "issue": {
    "category": string,
    "summary": string,
    "details": string,
    "urgency": "immediate" | "same-day" | "next-business-day" | "when-available",
    "desiredOutcome": string
  },
  "constraints": string[],
  "verification": string[],
  "availability": {
    "timezone": string | null,
    "preferredWindows": string[]               // e.g. ["Mon-Fri 9am-12pm"], leave [] if unknown
  },
  "caller": {                                  // who we represent when calling
    "name": string | null,
    "callback": string | null,                 // phone or email to receive follow up
    "identifiers": string[]                    // account/order/customer IDs if relevant
  },
  "followUp": {
    "nextSteps": string[],
    "notify": string[]
  },
  "notesForAgent": string
}`

export async function POST(req: NextRequest) {
  try {
  const { issueDetails, userQuery, issueId, knownContext } = await req.json()

    if (!process.env.INKEEP_API_KEY) {
      return NextResponse.json({ error: 'INKEEP_API_KEY not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(process.env.INKEEP_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
    })

    // Pull latest user/org settings from Convex for additional context
    let settings: any = null
    if (convex) {
      try {
        settings = await convex.query(api.orchestration.getSettings, {})
      } catch (e) {
        console.warn('Failed to fetch settings from Convex:', e)
      }
    }

  const prompt = `${SYSTEM_ROUTER_PROMPT}

Finalized issue summary (ISSUE_COMPLETE):\n${issueDetails}
User's initial query/topic: ${userQuery || 'N/A'}

Known context (JSON, may be partial):\n${knownContext ? JSON.stringify(knownContext) : '{"note":"none provided"}'}

 User settings from Convex (JSON, may be partial):\n${settings ? JSON.stringify(settings) : '{"note":"none found"}'}

Build the JSON now. Output JSON only.`

    // Enforce JSON output and schema using Gemini's supported Schema shape
    // Note: Do not use JSON Schema-only keywords like additionalProperties or type unions.
    const responseSchema: any = {
      type: 'object',
      properties: {
        callPurpose: { type: 'string' },
        contact: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['person', 'business', 'service'] },
            name: { type: 'string' },
            phoneNumber: { type: 'string' },
            altChannels: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'name', 'phoneNumber', 'altChannels'],
        },
        issue: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            summary: { type: 'string' },
            details: { type: 'string' },
            urgency: { type: 'string', enum: ['immediate', 'same-day', 'next-business-day', 'when-available'] },
            desiredOutcome: { type: 'string' },
          },
          required: ['category', 'summary', 'details', 'urgency', 'desiredOutcome'],
        },
        constraints: { type: 'array', items: { type: 'string' } },
        verification: { type: 'array', items: { type: 'string' } },
        availability: {
          type: 'object',
          properties: {
            timezone: { type: 'string' },
            preferredWindows: { type: 'array', items: { type: 'string' } },
          },
          required: ['timezone', 'preferredWindows'],
        },
        caller: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            callback: { type: 'string' },
            identifiers: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'callback', 'identifiers'],
        },
        followUp: {
          type: 'object',
          properties: {
            nextSteps: { type: 'array', items: { type: 'string' } },
            notify: { type: 'array', items: { type: 'string' } },
          },
          required: ['nextSteps', 'notify'],
        },
        notesForAgent: { type: 'string' },
      },
      required: [
        'callPurpose',
        'contact',
        'issue',
        'constraints',
        'verification',
        'availability',
        'caller',
        'followUp',
        'notesForAgent',
      ],
    }

    let result: any
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        } as any,
      })
    } catch (schemaErr) {
      console.warn('Gemini rejected responseSchema, retrying without schema:', schemaErr)
      // Fallback without responseSchema to keep flow alive
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        } as any,
      })
    }
    let raw = ''
    try {
      raw = result.response.text() || ''
    } catch {
      raw = ''
    }
    // Some models wrap JSON in fences; extract the JSON object substring
    const extractJson = (t: string) => {
      if (!t) return ''
      const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fenced && fenced[1]) return fenced[1].trim()
      const start = t.indexOf('{')
      const end = t.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) return t.slice(start, end + 1)
      return t
    }
    const text = extractJson(raw)
    
    // No grounding metadata since search tools are disabled
    const sources: string[] = []

    // Try to parse JSON; if it fails, wrap as notes
    let context: any
    try {
      context = JSON.parse(text)
    } catch {
      context = {
        callPurpose: 'Resolve user issue based on Gemini summary',
        contact: { type: 'service', name: 'Unknown', phoneNumber: null, altChannels: [] },
        issue: {
          category: 'general',
          summary: issueDetails?.slice(0, 160) || 'No summary',
          details: issueDetails || 'N/A',
          urgency: 'when-available',
          desiredOutcome: 'Successful resolution per user summary'
        },
        constraints: [],
        verification: [],
        availability: { timezone: null, preferredWindows: [] },
        caller: { name: null, callback: null, identifiers: [] },
        followUp: { nextSteps: [], notify: [] },
        notesForAgent: (raw && raw !== text ? raw : text) || 'No additional notes'
      }
    }

    // Defensive cleanup: if model returned serialized JSON inside strings for summary/details, keep as-is string values.

    // Zod validation for routing context
    const RoutingContextSchema = z.object({
      callPurpose: z.string(),
      contact: z.object({
        type: z.enum(['person', 'business', 'service']),
        name: z.string(),
        phoneNumber: z.string().nullable(),
        altChannels: z.array(z.string()),
      }),
      issue: z.object({
        category: z.string(),
        summary: z.string(),
        details: z.string(),
        urgency: z.enum(['immediate', 'same-day', 'next-business-day', 'when-available']),
        desiredOutcome: z.string(),
      }),
      constraints: z.array(z.string()),
      verification: z.array(z.string()),
      availability: z.object({
        timezone: z.string().nullable(),
        preferredWindows: z.array(z.string()),
      }),
      caller: z.object({
        name: z.string().nullable(),
        callback: z.string().nullable(),
        identifiers: z.array(z.string()),
      }),
      followUp: z.object({
        nextSteps: z.array(z.string()),
        notify: z.array(z.string()),
      }),
      notesForAgent: z.string(),
    }).strict()

    const validation = RoutingContextSchema.safeParse(context)
    if (!validation.success) {
      console.error('Routing context validation failed:', validation.error.format())
      // Build a safe fallback with validation notes
      const issues = validation.error.issues?.map(i => `${i.path.join('.')}: ${i.message}`) || []
      context = {
        callPurpose: 'Resolve user issue based on Gemini summary',
        contact: { type: 'service', name: 'Unknown', phoneNumber: null, altChannels: [] },
        issue: {
          category: 'general',
          summary: issueDetails?.slice(0, 160) || 'No summary',
          details: issueDetails || 'N/A',
          urgency: 'when-available',
          desiredOutcome: 'Successful resolution per user summary',
        },
        constraints: [],
        verification: [],
        availability: { timezone: null, preferredWindows: [] },
        caller: { name: null, callback: null, identifiers: [] },
        followUp: { nextSteps: [], notify: [] },
        notesForAgent: `Model output invalid, using fallback. Raw: ${typeof text === 'string' ? text.slice(0, 500) : ''}. Errors: ${issues.join(' | ')}`,
      }
    } else {
      context = validation.data
    }

    // Apply safe fallbacks from settings to maximize context quality
    const appliedKeys: string[] = []
    const fullName = settings?.firstName || settings?.lastName
      ? [settings?.firstName, settings?.lastName].filter(Boolean).join(' ').trim() || null
      : null
    if (!context.caller?.name && fullName) {
      context.caller.name = fullName
      appliedKeys.push('caller.name')
    }
    if (!context.caller?.callback && (settings?.phone || settings?.email)) {
      context.caller.callback = settings?.phone || settings?.email
      appliedKeys.push('caller.callback')
    }
    if (!context.availability?.timezone && settings?.timezone) {
      context.availability.timezone = settings.timezone
      appliedKeys.push('availability.timezone')
    }
    // If contact is generic and settings have a phone, consider using as fallback for callback only (not contact.phone)
    // Keep model's chosen contact intact to avoid wrong dials.

    // Save globally to Convex
    let persisted: { id?: string; createdAt?: string } = {}
    if (convex) {
      persisted = await convex.mutation(api.orchestration.setContext, {
        context,
        summary: `Routing context for issue ${issueId || 'N/A'}`,
        issueId: issueId || undefined,
        source: 'inkeep-routing-agent',
      })
    } else {
      console.warn('Convex URL not set; skipping persistence of routing context')
    }

    // Log on server for verification
    console.log('Inkeep routing context built:', { id: persisted.id, createdAt: persisted.createdAt, context, settingsApplied: appliedKeys })

    // Immediately start the voice call with Vapi using the dynamic context
    let call: any = null
    let callInitiated = false
    let callError: any = null
    try {
      // Idempotency guard: if a recent start request or monitor exists, skip triggering another call
      let shouldSkip = false
      if (convex && issueId) {
        try {
          const events = await convex.query(api.orchestration.listCallEvents, { issueId })
          const now = Date.now()
          // Recent 'start-call-request' within 12s or 'monitor' within 60s indicates a call is in-flight or active
          for (let i = events.length - 1; i >= 0; i--) {
            const ev = events[i] as any
            const ts = ev?.createdAt ? Date.parse(ev.createdAt) : 0
            if (ev?.type === 'start-call-request' && ts && now - ts < 12_000) { shouldSkip = true; break }
            if (ev?.type === 'monitor' && ts && now - ts < 60_000) { shouldSkip = true; break }
            // Break early if event is older than 60s
            if (ts && now - ts > 60_000) break
          }
          if (!shouldSkip) {
            // Place a short-lived start lock so parallel triggers skip
            await convex.mutation(api.orchestration.appendCallEvent, {
              issueId,
              type: 'start-call-request',
              content: JSON.stringify({ at: new Date().toISOString() }),
            })
          }
        } catch (e) {
          console.warn('Idempotency pre-check failed:', e)
        }
      }
      if (shouldSkip) {
        callInitiated = false
        callError = 'Skipped duplicate start-call: recent call in progress.'
      } else {
      const origin = new URL(req.url).origin
      const startResp = await fetch(`${origin}/api/vapi/start-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, context })
      })
      call = await startResp.json().catch(() => ({}))
      callInitiated = startResp.ok
      if (!startResp.ok) {
        callError = call?.error || 'Failed to start Vapi call'
        console.error('Vapi start-call failed from Inkeep route:', call)
      }
      }
    } catch (e) {
      callError = String(e)
      console.error('Error calling Vapi start-call from Inkeep route:', e)
    }

    // Return to client; client will also log to console
    return NextResponse.json({
      success: true,
      context,
      sources,
      settingsApplied: appliedKeys.length > 0,
      settingsUsedKeys: appliedKeys,
      convex: { id: persisted.id, createdAt: persisted.createdAt },
      callInitiated,
      call,
      callError,
    })

  } catch (error) {
    console.error('Inkeep API error:', error)
    return NextResponse.json(
      { error: 'Failed to process with Inkeep' },
      { status: 500 }
    )
  }
}

