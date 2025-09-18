import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null

// System prompt for agentic issue intake optimized for brevity and slot-filling
const SYSTEM_PROMPT = `You are a proactive intake agent preparing for a real phone call to resolve the user's problem.

Principles:
- Use the KNOWN CONTEXT and SETTINGS below as confirmed facts unless the user corrects them.
- Ask ONLY for missing or ambiguous fields. Max 2 concise questions per turn (bullets ok).
- Keep responses short (<= 4 sentences). Avoid long lists or copy-pasting content.
- Do NOT perform research here; a separate routing agent will handle that.
- Do NOT ask about fields already present in KNOWN CONTEXT or SETTINGS (e.g., name, phone, email, timezone, address).

Required fields to collect (fill as applicable):
1) Problem summary
2) Technical/context details (errors, repro steps, environment, IDs)
3) Impact
4) Desired outcome
5) Urgency
6) Contact to call (person/business/service) & phone/alt channels
7) Identity you represent when calling (user name) & callback info (phone/email)
8) Availability: timezone + preferred call windows
9) Constraints/preferences (budget, compliance, tone, do/don't)
10) Verification items to confirm during the call

Output rule when complete:
ISSUE_COMPLETE: {JSON summary of all collected fields}

Do not include any extra text before or after the ISSUE_COMPLETE line when you are done.`

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
      model: 'gemini-2.5-flash',
    })

    // Use full conversation history as provided
    const conversationHistory = (messages as ChatMessage[]).map((msg: ChatMessage) => ({
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
          parts: [{ text: 'Acknowledged. I\'ll keep it brief and ask only for missing info.' }]
        },
        ...conversationHistory
      ],
      generationConfig: {
        maxOutputTokens: 512,
      } as any,
    })

    // Minimal retry/backoff on 429 rate limit
    const lastUserContent = (messages[messages.length - 1]?.content || '')
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
    const result = await sendWithRetry()
    
    // Robust response extraction
    let response = ''
    try {
      response = result.response.text() || ''
    } catch (e) {
      console.error('Failed to extract response text:', e)
      const candidates = (result as any)?.response?.candidates
      console.log('Raw candidates:', JSON.stringify(candidates, null, 2))
      
      if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
        response = candidates[0].content.parts.map((p: any) => p.text || '').join('') || ''
      }
    }
    
    console.log('Raw Gemini response:', response)
    
    if (!response || response.trim() === '') {
      console.error('EMPTY RESPONSE from Gemini')
      response = 'I encountered an issue generating a response. Could you please rephrase your question?'
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


