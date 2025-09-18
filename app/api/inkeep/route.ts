import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

// Simple server-side Convex HTTP client if URL is present
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

// Routing agent: builds VAPI-ready context from a finalized Gemini transcript
const SYSTEM_ROUTER_PROMPT = `You are a routing and orchestration agent. Given a finalized chat transcript that identified a user's issue, build a precise, actionable call context for a downstream voice agent (VAPI) to place a phone call to a person/business/service to resolve the issue.

Output STRICT JSON with this schema:
{
  "callPurpose": string,                       // Clear one-liner of the call's objective
  "contact": {                                 // Who the agent should call
    "type": "person" | "business" | "service",
    "name": string,                            // Name of the person/business/service
    "phoneNumber": string | null,              // If available; otherwise null
    "altChannels": string[]                    // Optional alternative channels, e.g., website, email
  },
  "issue": {                                   // Structured issue details
    "category": string,                        // e.g., medical, utility, billing, technical, scheduling
    "summary": string,                         // concise summary
    "details": string,                         // key facts necessary to resolve the issue
    "urgency": "immediate" | "same-day" | "next-business-day" | "when-available",
    "desiredOutcome": string                   // what success looks like
  },
  "constraints": string[],                     // any constraints, preferences, budget, availability
  "verification": string[],                    // info the agent should verify during the call
  "followUp": {                                // post-call expectations
    "nextSteps": string[],
    "notify": string[]                         // who/how to notify when resolved
  },
  "notesForAgent": string                      // tone, sensitivities, compliance notes
}`

export async function POST(req: NextRequest) {
  try {
    const { issueDetails, userQuery, issueId } = await req.json()

    const anthropic = new Anthropic({ apiKey: "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"})

    // Build the routing context with Claude 3 Opus via Anthropic
    const completion = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1200,
      temperature: 0.1,
      system: SYSTEM_ROUTER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Finalized issue summary from Gemini (ISSUE_COMPLETE):\n${issueDetails}\n\nUser's initial query or topic: ${userQuery || 'N/A'}\n\nBuild the JSON now.`,
        },
      ],
    })

    const contentBlock = completion.content?.[0]
    const text = contentBlock && contentBlock.type === 'text' ? contentBlock.text : ''

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
        followUp: { nextSteps: [], notify: [] },
        notesForAgent: text || 'No additional notes'
      }
    }

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
    console.log('Inkeep routing context built:', { id: persisted.id, createdAt: persisted.createdAt, context })

    // Return to client; client will also log to console
    return NextResponse.json({
      success: true,
      context,
      convex: { id: persisted.id, createdAt: persisted.createdAt },
    })

  } catch (error) {
    console.error('Inkeep API error:', error)
    return NextResponse.json(
      { error: 'Failed to process with Inkeep' },
      { status: 500 }
    )
  }
}

