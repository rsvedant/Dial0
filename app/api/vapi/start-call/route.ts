import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { getToken } from '@/lib/auth-server'

// System prompt template provided by the user, now generalized for multiple call types with placeholders
const SYSTEM_TEMPLATE = `You place phone calls on behalf of {{callerName}} and speak AS {{callerName}}. Never describe yourself as an assistant or AI. Adapt your tone and approach to the call type and relationship.

## CALL TYPE & GOAL
- callType: {{callType}} (customer_service | personal | work | general). If missing, infer from the provided JSON context.
- contact: {{contactName}}
- goal: {{callGoal}}

## IDENTITY & GUARDRAILS
- You are {{callerName}}. In work mode, if {{callerOrg}} is provided, you may say "from {{callerOrg}}".
- Do not say “assistant”, “AI”, “I’m assisting with a call”, or similar self-referential phrases.
- Keep openings short and purpose-led. Don’t narrate internal steps.

## OPENINGS BY MODE (pick one based on callType)
- customer_service: "Hi, this is {{callerName}} calling about {{issueSummary}}. I need assistance with {{issueCategory}}."
- personal: "Hey {{contactName}}, it's {{callerName}}. {{personalOpener}}"
- work: "Hi {{contactName}}, this is {{callerName}} from {{callerOrg}}. {{workOpener}}"
- general: "Hi {{contactName}}, this is {{callerName}}. {{generalOpener}}"

If the other person asks “Who is this?” or “What do you want?”, respond in one sentence with your purpose, then proceed.

## MODE-SPECIFIC GUIDELINES
- customer_service:
  - Share verification details only as requested: name ({{callerName}}), phone ({{callerCallback}}), IDs ({{callerIdentifiers}}), address, and relevant issue details ({{issueDetails}}).
  - If IVR/menu is present: listen carefully, press numbers at the right time (0 for agent, 1 billing, 2 tech support as common patterns). Use navigate_ivr when needed.
  - Be persistent but polite; escalate to a supervisor if blocked.
- personal:
  - Be warm, natural, concise. No corporate language. Respect privacy boundaries.
  - Follow the stated goal (e.g., share news, request info, coordinate plans).
- work:
  - Be professional and succinct. If scheduling or confirming details, read back important items.
  - Use light context of employer or project only if helpful and present in context.
- general:
  - Be clear about purpose and keep things brief; adjust tone to relationship if indicated.

## SCHEDULING & CONFIRMATION
- When scheduling, always confirm date, time, timezone ({{timezone}}) and any confirmation numbers.
- Read back key details succinctly; avoid unnecessary filler (e.g., avoid “Are you still there?” unless there’s extended silence).

## STATUS & NOTES
- Stay on hold when necessary and keep short updates.
- Take notes via update_call_status when meaningful milestones occur.

## ESCALATION (customer_service only)
1. "I'd like to speak with a supervisor, please."
2. "Can you escalate this to someone with more authority?"
3. Record names and direct numbers when possible.

## END CALL FUNCTION
When the objective is satisfied or the other party ends the call, use the end_call tool.

## END-OF-CALL REPORT (REQUIRED)
At call conclusion, produce a concise report for the app UI:
- Outcome: Resolved | Partially Resolved | Scheduled | Escalated | Unable to Resolve
- 2–5 bullets: what happened, commitments (dates/times/ticket #s), and follow-ups
- If a callback/appointment was set: include date/time and confirmation number
- If verification occurred: list which identifiers (no sensitive data)
- Keep it under 1200 characters

Your spoken behavior during the call should capture details necessary to generate this report.`

function fillTemplate(tpl: string, data: Record<string, string | null | undefined>) {
  return tpl
    .replace(/{{callerName}}/g, data.callerName || 'Unknown')
    .replace(/{{contactName}}/g, data.contactName || 'Unknown')
    .replace(/{{callType}}/g, data.callType || 'customer_service')
    .replace(/{{callerOrg}}/g, data.callerOrg || '')
    .replace(/{{callGoal}}/g, data.callGoal || (data.issueSummary || 'the call objective'))
    .replace(/{{issueSummary}}/g, data.issueSummary || 'the issue')
    .replace(/{{issueCategory}}/g, data.issueCategory || 'general')
    .replace(/{{callerCallback}}/g, data.callerCallback || 'N/A')
    .replace(/{{callerIdentifiers}}/g, data.callerIdentifiers || 'N/A')
    .replace(/{{issueDetails}}/g, data.issueDetails || 'N/A')
    .replace(/{{availableWindows}}/g, data.availableWindows || 'anytime')
    .replace(/{{timezone}}/g, data.timezone || 'UTC')
    .replace(/{{personalOpener}}/g, data.personalOpener || 'Just wanted to check in about something important.')
    .replace(/{{workOpener}}/g, data.workOpener || 'I wanted to quickly coordinate on a detail from our project.')
    .replace(/{{generalOpener}}/g, data.generalOpener || 'I wanted to touch base briefly.')
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.VAPI_PRIVATE_API_KEY) {
      return NextResponse.json({ error: 'VAPI_PRIVATE_API_KEY not configured' }, { status: 500 })
    }
    if (!process.env.VAPI_PUBLIC_ASSISTANT_ID || !process.env.VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json({ error: 'VAPI assistant/phone IDs not configured' }, { status: 500 })
    }

  const { issueId, context: providedContext, authToken } = await req.json()

    const token = authToken ?? (await getToken())
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get context either from request or Convex latest for the issue
    let context: any = providedContext
    if (!context && issueId) {
      try {
        // Query latest context and filter by issue if supplied
        const latest = await fetchQuery(api.orchestration.latestContext, {}, { token })
        if (latest && (!latest.issueId || latest.issueId === issueId)) context = latest.context
      } catch (e) {
        console.warn('Failed fetching latest context from Convex:', e)
      }
    }
    if (!context) {
      return NextResponse.json({ error: 'No routing context available to start call' }, { status: 400 })
    }

    // Heuristic call type inference when not explicitly provided
    const inferCallType = (ctx: any): string => {
      try {
        const hasIssue = !!ctx?.issue?.summary || !!ctx?.issue?.category || !!ctx?.issue?.details
        const contactName = (ctx?.contact?.name || '').toLowerCase()
        const isCompanyLike = /support|service|customer|help|xfinity|verizon|comcast|bank|billing|insurance|utility/.test(contactName)
        if (ctx?.callType) return String(ctx.callType)
        if (hasIssue || isCompanyLike) return 'customer_service'
        const relationship = (ctx?.contact?.relationship || ctx?.relationship || '').toLowerCase()
        if (/girlfriend|boyfriend|partner|mom|dad|mother|father|sister|brother|spouse|wife|husband|friend/.test(relationship)) return 'personal'
        const hasWork = !!ctx?.work || !!ctx?.caller?.employer || !!ctx?.caller?.org
        if (hasWork) return 'work'
        return 'general'
      } catch {
        return 'general'
      }
    }

  // Prepare dynamic system message
    const sysMsgCore = fillTemplate(SYSTEM_TEMPLATE, {
      callerName: context?.caller?.name,
      callerOrg: context?.caller?.org || context?.caller?.employer || context?.work?.org,
      contactName: context?.contact?.name,
      callType: context?.callType || inferCallType(context),
      callGoal: context?.goal?.summary || context?.objective || context?.issue?.summary,
      issueSummary: context?.issue?.summary,
      issueCategory: context?.issue?.category,
      callerCallback: context?.caller?.callback,
      callerIdentifiers: Array.isArray(context?.caller?.identifiers) && context.caller.identifiers.length > 0 ? context.caller.identifiers.join(', ') : undefined,
      issueDetails: context?.issue?.details,
      availableWindows: Array.isArray(context?.availability?.preferredWindows) ? context.availability.preferredWindows.join(', ') : undefined,
      timezone: context?.availability?.timezone,
      personalOpener: context?.openers?.personal,
      workOpener: context?.openers?.work,
      generalOpener: context?.openers?.general,
    })
  const sysMsg = `${sysMsgCore}\n\n## FULL CONTEXT (verbatim JSON)\n${JSON.stringify(context, null, 2)}`
    // Log exact system prompt for verification
    console.log('[VAPI system prompt]', sysMsg)

  // Build webhook URL for Vapi callbacks (assistant.server.url precedence).
  // Prefer explicit env override (useful in local dev with tunnels),
  // otherwise fall back to this server's origin.
  const origin = req.headers.get('origin') || `${new URL(req.url).origin}`
  const baseWebhookUrl = process.env.VAPI_WEBHOOK_URL || `${origin}/api/vapi/webhook`
  const webhookUrl = (() => {
    const url = new URL(baseWebhookUrl)
    if (issueId) url.searchParams.set('issueId', issueId)
    url.searchParams.set('authToken', token)
    return url.toString()
  })()

    // Compose Vapi call request (valid schema)
    // Normalize contact phone to E.164 if available
    const normalizePhone = (raw?: string | null) => {
      if (!raw) return null
      let s = String(raw).trim()
      // Keep leading +, strip others
      s = s.replace(/[^+\d]/g, '')
      if (!s) return null
      if (!s.startsWith('+')) {
        // Heuristic: assume US if 10 digits
        const digits = s.replace(/\D/g, '')
        if (digits.length === 10) return `+1${digits}`
        if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
      }
      return s
    }
    const dialNumber = normalizePhone(context?.contact?.phoneNumber) || '+14082101111'

    // Fetch settings to determine voice override (transient assistant override)
    let settings: any | null = null
    try {
      settings = await fetchQuery(api.orchestration.getSettings, {}, { token })
    } catch (e) {
      console.warn('Failed fetching settings from Convex:', e)
    }
    const voiceOverride = settings?.voiceId
      ? { provider: '11labs', voiceId: settings.voiceId as string }
      : { provider: '11labs', voiceId: 'sarah' }

    const body = {
      assistantId: process.env.VAPI_PUBLIC_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      // Ensure webhooks can correlate to our issue
      metadata: issueId ? { issueId, authToken: token } : { authToken: token },
      customer: {
        // Destination number in E.164
        number: dialNumber,
      },
      assistantOverrides: {
        // Webhook for server messages (takes precedence per assistant.server.url)
        server: { url: webhookUrl },
        // Ensure monitor URLs are provisioned (docs: monitorPlan.listenEnabled/controlEnabled)
        monitorPlan: {
          listenEnabled: true,
          controlEnabled: true,
        },
        // Ensure we receive live updates
        serverMessages: [
          'status-update',
          'speech-update',
          'transcript',
          'end-of-call-report',
          'conversation-update',
          'user-interrupted'
        ],
        // LLM config with dynamic system message
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          maxTokens: 1000,
          temperature: 0.7,
          messages: [
            { role: 'system', content: sysMsg },
          ],
        },
        // Voice config
        voice: voiceOverride,
        // Transcriber config
        transcriber: {
          provider: 'deepgram',
          model: 'nova-3',
          language: 'en',
        },
      },
    }

    const resp = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const json = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json({ error: json?.error || 'Failed to start Vapi call', details: json }, { status: resp.status })
    }

    // Persist a system message about the call start
    if (issueId) {
      try {
        await fetchMutation(api.orchestration.appendMessage, {
          issueId,
          role: 'system',
          content: `📞 Dialing ${context?.contact?.name || 'the service'} (${dialNumber}) about: ${context?.issue?.summary || 'your issue'}...`,
        }, { token })
        // If available, persist monitor URLs and append a dev-only example transcript
        const monitor = json?.call?.monitor || json?.monitor
        if (monitor?.listenUrl || monitor?.controlUrl) {
          try {
            await fetchMutation(api.orchestration.appendCallEvent, {
              issueId,
              callId: json?.call?.id || json?.id,
              type: 'monitor',
              content: JSON.stringify({ listenUrl: monitor.listenUrl, controlUrl: monitor.controlUrl }),
            }, { token })
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({ success: true, call: json, systemPromptPreview: sysMsg })
  } catch (error: any) {
    console.error('Vapi start-call error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
