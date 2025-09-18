import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

// System prompt for lightweight, progressive intake
const SYSTEM_PROMPT = `You are a helpful, lightweight intake agent preparing for a real phone call to resolve the user's problem.

Core behavior:
- Always respond to the user's last message directly. Never return an empty message.
- Use KNOWN CONTEXT and SETTINGS as facts unless the user corrects them.
- Build context progressively. If information is missing or ambiguous, ask at most ONE focused follow-up question.
- Keep responses brief (<= 3 sentences or a short bullet list). No long-form content, no research.
- Do NOT ask about fields already present in KNOWN CONTEXT or SETTINGS (e.g., name, phone, email, timezone, address).
- If the user asks a general question, answer succinctly first; only then ask one clarifying intake question if needed.

Minimal fields to collect over time (when relevant):
1) Problem summary
2) Key details (errors, repro steps, environment, IDs)
3) Desired outcome (what the user wants to happen)
4) Availability: timezone + preferred call windows (optional if not discussed yet)

Completion signal:
Only when you have a clear summary, some meaningful details, and the desired outcome, output a final line:
ISSUE_COMPLETE: { JSON with summary, details, desiredOutcome, and any availability you have }

Otherwise, just reply naturally and keep it moving. Never output empty text.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, issueId, knownContext } = await req.json()

    // Guardrails: if the final user input is extremely long, cap it slightly to avoid oversized requests
    if (Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last && typeof last.content === 'string' && last.content.length > 2000) {
        last.content = last.content.slice(0, 2000)
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({
      // Use a widely available, reliable model
      model: 'gemini-1.5-flash',
    })

    // Use conversation history EXCEPT the last user turn (we'll send that as the new message)
    const msgs = (messages as ChatMessage[])
    const historyWithoutLast = msgs.length > 0 ? msgs.slice(0, -1) : []
    const conversationHistory = historyWithoutLast.map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Fetch latest settings from Convex to pre-fill identity/contacts/timezone so we don't ask for them
    let settings: any = null
    if (convex) {
      try {
        settings = await convex.query(api.orchestration.getSettings, {})
      } catch (e) {
        console.warn('Failed to fetch settings from Convex (intake):', e)
      }
    }

    // Log what we're sending to debug empty responses
    const systemText = `${SYSTEM_PROMPT}\n\nKNOWN CONTEXT (JSON):\n${knownContext ? JSON.stringify(knownContext) : '{}'}\n\nSETTINGS (JSON):\n${settings ? JSON.stringify(settings) : '{}'}`
    console.log('Chat intake payload:', {
      systemTextLength: systemText.length,
      historyLength: conversationHistory.length,
      lastUserMessage: messages[messages.length - 1]?.content || 'NO_LAST_MESSAGE',
      knownContext,
      settings
    })

    // Start chat with system prompt
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemText }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I\'ll respond directly, keep it short, and ask at most one focused question when needed.' }]
        },
        ...conversationHistory
      ],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.3,
      } as any,
    })

    // Minimal retry/backoff on 429 rate limit
  const lastUserContent = (msgs[msgs.length - 1]?.content || '')
    const sendWithRetry = async () => {
      try {
        console.log('Sending to Gemini:', lastUserContent)
        return await chat.sendMessage(lastUserContent)
      } catch (err: any) {
        const msg = String(err?.message || err)
        console.error('Gemini error:', err)
        if (msg.includes('429')) {
          console.log('Hit 429, retrying after 800ms...')
          await new Promise((r) => setTimeout(r, 800))
          return await chat.sendMessage(lastUserContent)
        }
        throw err
      }
    }
  let result = await sendWithRetry()
    
    // Robust response extraction
    let response = ''
    let finishedReason: string | undefined
    let safety: any
    try {
      response = result.response.text() || ''
      finishedReason = (result as any)?.response?.candidates?.[0]?.finishReason
      safety = (result as any)?.response?.candidates?.[0]?.safetyRatings
    } catch (e) {
      console.error('Failed to extract response text:', e)
    }
    // If empty, try reconstructing from candidates
    if (!response || response.trim() === '') {
      const candidates = (result as any)?.response?.candidates
      if (candidates && candidates.length > 0) {
        const texts: string[] = []
        for (const c of candidates) {
          finishedReason = finishedReason || c?.finishReason
          safety = safety || c?.safetyRatings
          const parts = c?.content?.parts || []
          for (const p of parts) {
            if (typeof p?.text === 'string') texts.push(p.text)
          }
        }
        response = texts.join('').trim()
      }
    }
    console.log('Raw Gemini response:', response, 'finishReason:', finishedReason, 'safety:', safety)
    // If still empty, try a single gentle retry prompting a short reply
    if (!response || response.trim() === '') {
      console.warn('Empty model response; retrying once with a brief nudge...')
      try {
        await new Promise((r) => setTimeout(r, 300))
        const retry = await chat.sendMessage(`${lastUserContent}\n\nPlease reply briefly (one or two sentences).`)
        response = retry.response.text() || ''
        if (!response || response.trim() === '') {
          const rcands = (retry as any)?.response?.candidates
          if (rcands && rcands.length > 0) {
            const texts: string[] = []
            for (const c of rcands) {
              const parts = c?.content?.parts || []
              for (const p of parts) {
                if (typeof p?.text === 'string') texts.push(p.text)
              }
            }
            response = texts.join('').trim()
          }
        }
      } catch (retryErr) {
        console.error('Retry after empty response failed:', retryErr)
      }
    }
    // If still empty, provide a helpful message based on finishReason/safety
    if (!response || response.trim() === '') {
      console.error('EMPTY RESPONSE from Gemini')
      const safetyNote = finishedReason === 'SAFETY'
        ? ' I may have been blocked by a safety filter. Please rephrase or add a bit more detail.'
        : ''
      response = `I had trouble generating a reply just now.${safetyNote} Could you rephrase or provide a little more detail?`
    }

    // Extract grounding metadata (if any)
    // Chat intake no longer uses grounding tools; keep empty arrays for compatibility
    const sources: string[] = []
    const webSearchQueries: string[] = []
    const dynamicRetrievalScore: number | undefined = undefined

    // Check if issue understanding is complete (robust – allow minor prefaces)
    const completeMatch = response.match(/ISSUE_COMPLETE\s*:/i)
    const isComplete = Boolean(completeMatch)
    let issueDetails: string | undefined = undefined
    if (isComplete) {
      const idx = completeMatch!.index ?? 0
      const after = response.slice(idx).replace(/^[^\{]*:/, '').trim()
      issueDetails = after
    }
    
    return NextResponse.json({
      message: response,
      isComplete,
      issueDetails,
      issueId,
      sources,
      webSearchQueries,
      dynamicRetrievalScore,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Check if it's a 429 and tell the user
    const errorMsg = String(error)
    if (errorMsg.includes('429')) {
      return NextResponse.json(
        { error: '429 Rate Limited - Too many requests to Gemini API. Try again in a moment.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to process chat message: ${errorMsg}` },
      { status: 500 }
    )
  }
}


