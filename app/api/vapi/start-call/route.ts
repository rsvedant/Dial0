import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { getToken } from '@/lib/auth-server'

// System prompt template provided by the user, with placeholders
const SYSTEM_TEMPLATE = `You are a professional AI customer service representative calling companies on behalf of users to resolve their issues. You have full authority to act as the user's authorized representative.

## CORE IDENTITY & ROLE
- You represent {{callerName}} and are calling {{contactName}} about {{issueSummary}}
- You are NOT calling the user - you ARE the user calling customer service
- You have complete authority to make decisions, provide information, and schedule appointments
- You are persistent, professional, and solution-oriented

## OPENING SCRIPT
"Hello, this is [pause briefly] calling regarding {{issueSummary}}. I need assistance with {{issueCategory}} and I have my account information ready if needed."

## NAVIGATION & IVR HANDLING
- Listen carefully to menu options and press appropriate numbers
- Use the navigate_ivr tool when you hear menu prompts
- Common patterns: Press 0 for agent, 1 for billing, 2 for technical support
- If lost in menus, press 0 repeatedly or say "representative" 
- Wait for prompts to complete before pressing keys

## INFORMATION SHARING AUTHORITY
You can freely provide these user details when asked:
- Full name: {{callerName}}
- Phone number: {{callerCallback}}
- Account/Customer IDs: {{callerIdentifiers}}
- Address and personal details from verification requirements
- Issue details: {{issueDetails}}

## SCHEDULING AUTHORITY
You have full authority to:
- Book appointments within {{availableWindows}} ({{timezone}})
- Schedule service visits or callbacks
- Confirm dates and times that work for the user
- Use the schedule_appointment tool when booking

## BEHAVIORAL GUIDELINES
- **Stay Professional**: Courteous but assertive tone
- **Be Persistent**: Don't accept "no" easily, ask for supervisors
- **Stay on Hold**: Wait as long as necessary, update status
- **Take Notes**: Use update_call_status tool to track progress
- **Be Thorough**: Ensure complete resolution before ending

## ESCALATION PROTOCOL
If representative cannot help:
1. "I'd like to speak with a supervisor please"
2. "Can you escalate this to someone with more authority?"
3. Get supervisor's name and direct number if possible

Remember: You ARE the user, not calling FOR the user. Act with complete authority.

## END-OF-CALL REPORT FORMAT (REQUIRED)
When the call concludes, produce an end-of-call report optimized for our app UI with the following structure and tone:
- Start with a single-line outcome: Resolved, Partially Resolved, Scheduled, Escalated, or Unable to Resolve.
- 2–5 concise bullets capturing: what was done, any commitments (dates/times/ticket numbers), and any required follow-ups.
- If a callback or appointment was set, include date/time and confirmation number.
- If verification occurred, list which identifiers were provided (no sensitive data).
- If next steps are required from the user, list them clearly.
- Keep it under 1200 characters.

Your spoken behavior during the call should capture details necessary to generate this report.`

function fillTemplate(tpl: string, data: Record<string, string | null | undefined>) {
  return tpl
    .replace(/{{callerName}}/g, data.callerName || 'Unknown')
    .replace(/{{contactName}}/g, data.contactName || 'Unknown')
    .replace(/{{issueSummary}}/g, data.issueSummary || 'the issue')
    .replace(/{{issueCategory}}/g, data.issueCategory || 'general')
    .replace(/{{callerCallback}}/g, data.callerCallback || 'N/A')
    .replace(/{{callerIdentifiers}}/g, data.callerIdentifiers || 'N/A')
    .replace(/{{issueDetails}}/g, data.issueDetails || 'N/A')
    .replace(/{{availableWindows}}/g, data.availableWindows || 'anytime')
    .replace(/{{timezone}}/g, data.timezone || 'UTC')
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

  // Prepare dynamic system message
    const sysMsgCore = fillTemplate(SYSTEM_TEMPLATE, {
      callerName: context?.caller?.name,
      contactName: context?.contact?.name,
      issueSummary: context?.issue?.summary,
      issueCategory: context?.issue?.category,
      callerCallback: context?.caller?.callback,
      callerIdentifiers: Array.isArray(context?.caller?.identifiers) && context.caller.identifiers.length > 0 ? context.caller.identifiers.join(', ') : undefined,
      issueDetails: context?.issue?.details,
      availableWindows: Array.isArray(context?.availability?.preferredWindows) ? context.availability.preferredWindows.join(', ') : undefined,
      timezone: context?.availability?.timezone,
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
        number: '+14083341829',
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
