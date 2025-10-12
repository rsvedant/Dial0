import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { getToken } from '@/lib/auth-server'

export async function POST(req: NextRequest) {
  try {
  const raw = await req.json()
    // Vapi typically wraps server webhooks as { message: { ... } }
    const event = raw?.message ? raw.message : raw
  // Try metadata, then query string (we append issueId in start-call)
  const url = new URL(req.url)
  const issueIdQuery = url.searchParams.get('issueId') || undefined
  const issueId: string | undefined = event?.metadata?.issueId || raw?.metadata?.issueId || issueIdQuery
    const type: string = event?.type || 'unknown'
    const callId: string | undefined = event?.call?.id || event?.callId

    const forwardedToken = (event?.metadata?.authToken || raw?.metadata?.authToken || url.searchParams.get('authToken')) as string | undefined
    let token: string | null | undefined = forwardedToken && typeof forwardedToken === 'string' ? forwardedToken : null
    if (!token) {
      token = await getToken()
    }

    if (!issueId) {
      return NextResponse.json({ ok: true })
    }

    const mutate = async <TArgs extends object>(mutation: any, args: TArgs, label: string) => {
      if (!token) {
        console.warn('Skipping Convex mutation due to missing auth token', { mutation: label })
        return
      }
      try {
        await fetchMutation(mutation, args, { token })
      } catch (err) {
        console.error('Convex mutation failed', { mutation: label, err })
      }
    }

    // Append human-friendly status updates to chat (minimal)
    const appendChat = async (content: string) => {
      await mutate(
        api.orchestration.appendMessage,
        {
          issueId,
          role: 'system',
          content,
        },
        'orchestration.appendMessage',
      )
    }

    // Store structured call event
    const appendEvent = async (payload: {
      type: string; role?: string; content?: string; status?: string
    }) => {
      await mutate(
        api.orchestration.appendCallEvent,
        {
          issueId,
          callId,
          ...payload,
        },
        'orchestration.appendCallEvent',
      )
    }

    console.log('[VAPI webhook] Event received:', { type, issueId, callId, hasToken: !!token })
    
    if (type === 'call.started' || type === 'status-update' && (event?.status === 'started' || event?.status === 'in-progress')) {
      console.log('[VAPI webhook] Call started event')
      await appendEvent({ type: 'lifecycle', status: 'started' })
      await appendChat('📞 Call started.')
    } else if (type === 'call.ended' || (type === 'status-update' && event?.status === 'ended')) {
      console.log('[VAPI webhook] Call ended event')
      await appendEvent({ type: 'lifecycle', status: 'ended' })
      await appendChat('📞 Call ended. Generating final report…')
    } else if (type === 'call.update' || type === 'status-update') {
      const status = event?.status || 'in progress'
      console.log('[VAPI webhook] Status update:', status)
      await appendEvent({ type: 'status', status })
    } else if (
      type === 'transcript' ||
      type === 'transcript.delta' ||
      type === 'transcript.appended' ||
      (type === 'speech-update' && (event?.transcript || event?.delta))
    ) {
      // Handle live transcript updates
      const role = (event?.role || event?.speaker || event?.from || '').toString()
      const text: string | undefined = event?.text || event?.delta || event?.message || event?.transcript
      console.log('[VAPI webhook] Transcript event:', { role, textLength: text?.length, type })
      if (text && text.trim()) {
        await appendEvent({ type: 'transcript', role, content: text })
        console.log('[VAPI webhook] Transcript saved to database')
      }
    } else if (type === 'end-of-call-report') {
      // Final summary with messages/transcript and recording metadata
      const summary: string | undefined = event?.summary
      const finalTranscript: string | undefined = event?.transcript
      const recordingUrl: string | undefined = event?.recordingUrl
      // Some providers include cost/duration on the call object
      const cost = event?.call?.cost ?? event?.cost
      let durationSec: number | undefined = event?.call?.durationSec ?? event?.durationSec ?? event?.call?.durationSeconds

      // Fetch canonical call record from Vapi for precise duration when available
      if (callId && process.env.VAPI_PRIVATE_API_KEY) {
        try {
          const callDetailsResp = await fetch(`https://api.vapi.ai/call/${encodeURIComponent(callId)}`, {
            headers: {
              Authorization: `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          })
          if (callDetailsResp.ok) {
            const callDetails = await callDetailsResp.json().catch(() => null)
            const detail = callDetails?.call ?? callDetails
            const startedAtIso: string | undefined = detail?.startedAt
            const endedAtIso: string | undefined = detail?.endedAt
            const startMs = startedAtIso ? Date.parse(startedAtIso) : NaN
            const endMs = endedAtIso ? Date.parse(endedAtIso) : NaN
            if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
              durationSec = Math.max(0, Math.round((endMs - startMs) / 1000))
            }
            if (startedAtIso || endedAtIso) {
              await appendEvent({
                type: 'call-details',
                content: JSON.stringify({ startedAt: startedAtIso, endedAt: endedAtIso, durationSec }),
              })
            }
          } else {
            console.warn('Failed to fetch Vapi call details', await callDetailsResp.text())
          }
        } catch (detailsError) {
          console.error('Error fetching Vapi call duration', detailsError)
        }
      } else if (callId && !process.env.VAPI_PRIVATE_API_KEY) {
        console.warn('VAPI_PRIVATE_API_KEY not configured; skipping call duration fetch')
      }

      const minutesUsed = typeof durationSec === 'number' ? Math.max(1, Math.ceil(durationSec / 60)) : undefined

      if (summary) await appendEvent({ type: 'status', status: `summary: ${summary}` })
      if (finalTranscript) await appendEvent({ type: 'transcript', role: 'final', content: finalTranscript })
      if (recordingUrl) {
        await appendEvent({
          type: 'recording',
          content: JSON.stringify({ recordingUrl, cost, durationSec }),
        })
      }

      if (minutesUsed) {
        await mutate(
          api.orchestration.recordVoiceMinutesUsage,
          {
            issueId,
            callId,
            durationSec,
            minutes: minutesUsed,
          },
          'orchestration.recordVoiceMinutesUsage',
        )
      }

      // Append a formatted system message visible in the chat UI
      const lines: string[] = []
      lines.push('✅ End of call report')
      if (summary) lines.push('', summary)
      const meta: string[] = []
      if (typeof durationSec === 'number') meta.push(`duration: ${Math.round(durationSec)}s`)
      if (meta.length) lines.push('', `(${meta.join(' · ')})`)
      if (recordingUrl) lines.push('', `🔗 Recording: ${recordingUrl}`)
      await appendChat(lines.join('\n'))

      // Only resolve the issue once the end-of-call report has been received
      await mutate(
        api.orchestration.updateIssueStatus,
        { id: issueId as any, status: 'resolved' },
        'orchestration.updateIssueStatus',
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Vapi webhook error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
