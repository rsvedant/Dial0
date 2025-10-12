import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { getToken } from '@/lib/auth-server'
import { z } from 'zod'

// Call-type-specific strategies
const CALL_STRATEGIES = {
  financial: `
## YOUR GOAL
{{desiredOutcome}}

## STRATEGY FOR BILLING/FINANCIAL CALLS
- Mention loyalty if you've been a customer for years
- Reference competitor pricing if you know it
- Be polite but persistent
- If they can't help: "Could I speak with someone who handles billing adjustments?"

## PACING
Moderate - give them time to pull up your account and review options.`,

  insurance: `
## YOUR GOAL
File a claim and get a claim number with timeline.

## STRATEGY FOR INSURANCE/CLAIMS
- Be thorough - they're documenting everything
- Provide policy/claim numbers immediately when asked
- Describe incident with details (what, when, where)
- Ask for written confirmation
- Note any reference numbers they give you

## PACING
Slower - they're taking detailed notes. Pause frequently so they can type.`,

  booking: `
## YOUR GOAL
Schedule {{serviceType}}.

## STRATEGY FOR BOOKING/APPOINTMENTS
- Keep it brief and efficient
- State preferred dates/times clearly
- Ask for confirmation number
- Confirm details (date, time, location)

## PACING
Fast - these are usually quick transactions. Be ready with your availability.`,

  account: `
## YOUR GOAL
{{desiredOutcome}}

## STRATEGY FOR ACCOUNT CHANGES
- State your intention clearly upfront
- Expect retention questions - be polite but firm
- "I appreciate the offer, but I've made my decision"
- Get confirmation number for the change
- Ask about any final billing or equipment return

## PACING
Moderate - expect them to ask why and offer alternatives.`,

  technical: `
## YOUR GOAL
Fix {{issue}} - get service restored or schedule a technician.

## STRATEGY FOR TECHNICAL SUPPORT
- Brief problem description first
- Mention what you've already tried
- Answer their diagnostic questions
- Have availability ready for technician
- Note confirmation numbers and time windows

## PACING
Variable - match their troubleshooting pace. They'll ask diagnostic questions.`,

  general: `
## YOUR GOAL
{{desiredOutcome}}

## STRATEGY
- Keep it conversational
- Let them guide the call
- Answer their questions directly

## PACING
Moderate - follow their lead.`
}

// Core system prompt template
const SYSTEM_TEMPLATE = `You are {{callerName}}, a real person making a call.

## WHO YOU ARE ⚠️
YOU are {{callerName}}, the customer.
THEY are the {{contactName}} agent/representative.
YOU called THEM for help.

This means:
- Start with: "Hi, this is {{callerName}}"
- NOT "Hey {{contactName}}" or "Hey [Company]"
- THEY will ask YOU questions
- YOU answer THEIR questions

{{callStrategy}}

## OPENING (Brief - 15 seconds max)
{{openingLine}}

[PAUSE 2-3 seconds. Wait for them to respond.]

After they respond, you can add more context if they ask for it.

## ⚠️ ONE-AT-A-TIME RULE (MOST IMPORTANT)

When the agent asks for information, give ONLY what they asked for, then STOP and WAIT.

Agent: "Can I get your name?"
You: "It's {{callerName}}"
[WAIT. Stay silent until they ask the next question.]

Agent: "What's your phone number?"
You: "{{callerCallback}}"
[WAIT. Stay silent.]

Agent: "And your account number?"
You: "{{callerIdentifiers}}"
[WAIT. Stay silent.]

❌ NEVER EVER DO THIS:
"My name is {{callerName}}, phone number {{callerCallback}}, email {{callerEmail}}, address..."

✅ ALWAYS DO THIS:
Answer the ONE question they asked, then PAUSE and WAIT for the next question.

## PACING & LISTENING ⚠️

- If agent says "hold on" or "let me type" → STAY COMPLETELY SILENT until they speak again
- If agent says "slow down" → Give information EVEN MORE slowly, pause 3-4 seconds between items
- If agent says "one at a time" → Give ONLY one piece of info, then STOP
- Pause 2-3 seconds after giving each piece of information
- Let THEM control the pace
- Real people don't rush or dump information

## HOW REAL PEOPLE TALK

- Use natural fillers: "Yeah", "Sure", "Uh huh", "Right", "Okay"
- Add brief context when relevant: "Yeah, I already tried rebooting it"
- Don't be robotic - vary your responses
- Listen fully before responding
- Speak at a normal conversational pace (not rushed)

## NEVER DO THIS ❌

❌ Greeting them with "Hey {{contactName}}" or "Hey [Company Name] support"
❌ Info dumping: "My name is X, phone is Y, email is Z, address is..." 
❌ Continuing to talk after agent says "slow down" or "hold on"
❌ Asking "What do you need from me?" (YOU called THEM)
❌ Listing items robotically without being asked
❌ Speaking too fast or rushing through information

## CONFIRMATIONS

When they give you important info (appointment times, confirmation numbers), repeat it back:

Agent: "I've scheduled you for Tuesday at 5pm, confirmation XYZ-789"
You: "Tuesday at 5pm, confirmation XYZ-789. Got it, thank you!"

❌ DO NOT summarize the call
❌ DO NOT read out a report

## YOUR INFORMATION (Only share when specifically asked)

Name: {{callerName}}
Phone: {{callerCallback}}
{{#if callerIdentifiers}}Account/Reference: {{callerIdentifiers}}{{/if}}
{{#if callerEmail}}Email: {{callerEmail}}{{/if}}
{{#if availableWindows}}Availability: {{availableWindows}}{{/if}}

## CONTEXT FOR THIS CALL

{{fullContext}}`

// Schema validation for context header
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

// Detect call type from context
function detectCallType(context: any): string {
  const category = (context?.issue?.category || '').toLowerCase()
  const summary = (context?.issue?.summary || '').toLowerCase()
  const details = (context?.issue?.details || '').toLowerCase()
  const combined = `${category} ${summary} ${details}`
  
  // Financial: bills, fees, refunds, negotiation
  if (/bill|billing|fee|refund|payment|cost|price|lower|expensive|negotiate|subscription|charge/.test(combined)) {
    return 'financial'
  }
  
  // Insurance: claims, compensation
  if (/claim|insurance|compensation|premium|coverage|reimburs|flight.*delay|flight.*cancel/.test(combined)) {
    return 'insurance'
  }
  
  // Booking: appointments, reservations
  if (/appointment|booking|schedule|reserv|book|doctor|dentist|salon|restaurant|table/.test(combined)) {
    return 'booking'
  }
  
  // Account: changes, cancellations, setup
  if (/account|cancel.*service|cancel.*account|close.*account|setup|activate|update.*info|change.*address/.test(combined)) {
    return 'account'
  }
  
  // Technical: troubleshooting, outages, technical issues
  if (/technical|support|fix|broken|not.*work|outage|down|error|troubleshoot|wifi|internet|connection/.test(combined)) {
    return 'technical'
  }
  
  return 'general'
}

// Generate opening line based on call type and context
function generateOpeningLine(callType: string, context: any): string {
  const callerName = context?.caller?.name || 'the caller'
  const issueSummary = context?.issue?.summary || 'an issue'
  const serviceType = context?.issue?.category || 'service'
  
  switch (callType) {
    case 'financial':
      return `Hi, this is ${callerName}, I'm calling about my bill. I was hoping we could discuss lowering it.`
    case 'insurance':
      return `Hi, this is ${callerName}, I need to file a claim.`
    case 'booking':
      return `Hi, this is ${callerName}, I'd like to schedule an appointment.`
    case 'account':
      const action = /cancel/.test(context?.issue?.summary || '') ? 'cancel' : 'update'
      return `Hi, this is ${callerName}, I need to ${action} my account.`
    case 'technical':
      return `Hi, this is ${callerName}, I need help with ${issueSummary}.`
    default:
      return `Hi, this is ${callerName}, I'm calling about ${issueSummary}.`
  }
}

function fillTemplate(tpl: string, data: Record<string, string | null | undefined>): string {
  let result = tpl
  
  // Handle conditional blocks {{#if var}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : ''
  })
  
  // Replace simple variables
  const replacements: Record<string, string> = {
    callerName: data.callerName || 'Unknown',
    contactName: data.contactName || 'the service',
    callType: data.callType || 'general',
    callerOrg: data.callerOrg || '',
    issueSummary: data.issueSummary || 'the issue',
    issueCategory: data.issueCategory || 'general',
    serviceType: data.serviceType || 'service',
    callerCallback: data.callerCallback || 'not provided',
    callerIdentifiers: data.callerIdentifiers || 'not provided',
    callerEmail: data.callerEmail || '',
    issueDetails: data.issueDetails || '',
    issue: data.issue || data.issueSummary || 'the issue',
    when: data.when || 'recently',
    desiredOutcome: data.desiredOutcome || 'resolve this issue',
    action: data.action || 'update',
    availableWindows: data.availableWindows || '',
    callStrategy: data.callStrategy || '',
    openingLine: data.openingLine || `Hi, this is ${data.callerName}, I need help.`,
    fullContext: data.fullContext || '{}'
  }
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }
  
  return result
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.VAPI_PRIVATE_API_KEY) {
      return NextResponse.json({ error: 'VAPI_PRIVATE_API_KEY not configured' }, { status: 500 })
    }
    if (!process.env.VAPI_PUBLIC_ASSISTANT_ID || !process.env.VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json({ error: 'VAPI assistant/phone IDs not configured' }, { status: 500 })
    }

    // Read issueId and authToken from headers, context from body
    const issueId = req.headers.get('issueId')
    const authToken = req.headers.get('authToken')
    const requestBody = await req.json().catch(() => ({}))
    const headerEntries = Object.fromEntries(req.headers.entries())
    console.log('[MCP→/api/vapi/start-call] headers:', headerEntries)
    console.log('[MCP→/api/vapi/start-call] body:', requestBody)
    
    // Parse and validate context from body
    let providedContext = null
    if (requestBody.context) {
      try {
        // Validate against schema
        const validated = contextSchema.parse(requestBody.context)
        providedContext = validated
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ 
            error: 'Invalid context schema', 
            details: error.errors 
          }, { status: 400 })
        }
        return NextResponse.json({ 
          error: 'Failed to parse context from body',
          details: String(error)
        }, { status: 400 })
      }
    }

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

    // Detect call type and generate appropriate strategy
    const callType = detectCallType(context)
    const callStrategy = CALL_STRATEGIES[callType as keyof typeof CALL_STRATEGIES] || CALL_STRATEGIES.general
    const openingLine = generateOpeningLine(callType, context)
    
    console.log('[VAPI call type detected]', callType, 'for issue:', context?.issue?.summary)
    
    // Extract email from caller identifiers if present
    let callerEmail = ''
    if (Array.isArray(context?.caller?.identifiers)) {
      const emailEntry = context.caller.identifiers.find((id: string) => 
        typeof id === 'string' && /email/i.test(id)
      )
      if (emailEntry) {
        const match = emailEntry.match(/:\s*(.+)/)
        if (match) callerEmail = match[1].trim()
      }
    }
  
    // Prepare dynamic system message with call-type-specific strategy
    const sysMsg = fillTemplate(SYSTEM_TEMPLATE, {
      callerName: context?.caller?.name,
      contactName: context?.contact?.name,
      callType,
      issueSummary: context?.issue?.summary,
      serviceType: context?.issue?.category || 'service',
      callerCallback: context?.caller?.callback,
      callerEmail,
      callerIdentifiers: Array.isArray(context?.caller?.identifiers) && context.caller.identifiers.length > 0 
        ? context.caller.identifiers.join(', ') 
        : undefined,
      issue: context?.issue?.summary,
      desiredOutcome: context?.issue?.desiredOutcome || context?.goal?.summary || 'resolve this',
      availableWindows: Array.isArray(context?.availability?.preferredWindows) && context.availability.preferredWindows.length > 0
        ? context.availability.preferredWindows.join(', ')
        : undefined,
      callStrategy,
      openingLine,
      fullContext: JSON.stringify(context, null, 2),
    })
    
    // Log for verification
    console.log('[VAPI system prompt length]', sysMsg.length, 'chars')
    console.log('[VAPI opening line]', openingLine)

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
    let dialNumber = normalizePhone(context?.contact?.phoneNumber) || ''

    // Fetch settings to determine voice override (transient assistant override) and test mode
    let settings: any | null = null
    try {
      settings = await fetchQuery(api.orchestration.getSettings, {}, { token })
    } catch (e) {
      console.warn('Failed fetching settings from Convex:', e)
    }
    
    // Check if test mode is enabled and use test number if available
    if (settings?.testModeEnabled && settings?.testModeNumber) {
      const testNumber = normalizePhone(settings.testModeNumber)
      if (testNumber) {
        dialNumber = testNumber
        console.log('[VAPI start-call] Test mode enabled, using test number:', dialNumber)
      }
    }
    
    // Determine voice to use:
    // 1. If user has a custom cloned voice (voiceId), use it
    // 2. If user selected a voice (selectedVoice), use that
    // 3. Otherwise use default 'sarah'
    const voiceSlug = settings?.voiceId || settings?.selectedVoice || 'sarah'
    const voiceOverride = { provider: '11labs', voiceId: voiceSlug }
    console.log('[VAPI start-call] Using voice:', voiceSlug, settings?.voiceId ? '(custom cloned)' : settings?.selectedVoice ? '(selected)' : '(default)')

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
          provider: 'groq',
          model: 'moonshotai/kimi-k2-instruct-0905',
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

    return NextResponse.json({ success: true, call: json, systemPromptPreview: sysMsg.substring(0, 1000) + '...', detectedCallType: callType })
  } catch (error: any) {
    console.error('Vapi start-call error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
