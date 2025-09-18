import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

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

    if (!convex || !issueId) {
      return NextResponse.json({ ok: true })
    }

    // Append human-friendly status updates to chat (minimal)
    const appendChat = async (content: string) => {
      try {
        await convex.mutation(api.orchestration.appendMessage, {
          issueId,
          role: 'system',
          content,
        })
      } catch {}
    }

    // Store structured call event
    const appendEvent = async (payload: {
      type: string; role?: string; content?: string; status?: string
    }) => {
      try {
        await convex.mutation(api.orchestration.appendCallEvent, {
          issueId,
          callId,
          ...payload,
        })
      } catch {}
    }

    if (type === 'call.started' || type === 'status-update' && (event?.status === 'started' || event?.status === 'in-progress')) {
      await appendEvent({ type: 'lifecycle', status: 'started' })
      await appendChat('📞 Call started.')
    } else if (type === 'call.ended' || (type === 'status-update' && event?.status === 'ended')) {
      await appendEvent({ type: 'lifecycle', status: 'ended' })
      await appendChat('📞 Call ended. Generating final report…')
    } else if (type === 'call.update' || type === 'status-update') {
      const status = event?.status || 'in progress'
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
      if (text && text.trim()) {
        await appendEvent({ type: 'transcript', role, content: text })
      }
    } else if (type === 'end-of-call-report') {
      // Final summary with messages/transcript and recording metadata
      const summary: string | undefined = event?.summary
      const finalTranscript: string | undefined = event?.transcript
      const recordingUrl: string | undefined = event?.recordingUrl
      // Some providers include cost/duration on the call object
      const cost = event?.call?.cost ?? event?.cost
      const durationSec = event?.call?.durationSec ?? event?.durationSec ?? event?.call?.durationSeconds

      if (summary) await appendEvent({ type: 'status', status: `summary: ${summary}` })
      if (finalTranscript) await appendEvent({ type: 'transcript', role: 'final', content: finalTranscript })
      if (recordingUrl) {
        await appendEvent({
          type: 'recording',
          content: JSON.stringify({ recordingUrl, cost, durationSec }),
        })
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
      try {
        await convex.mutation(api.orchestration.updateIssueStatus, { id: issueId as any, status: 'resolved' })
      } catch {}
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Vapi webhook error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
