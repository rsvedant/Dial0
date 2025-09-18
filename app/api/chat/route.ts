import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// System prompt for issue understanding
const SYSTEM_PROMPT = `You are an intelligent customer support assistant. Your goal is to understand user issues completely before escalating them.

Your conversation flow:
1. **Initial Understanding**: Ask clarifying questions about the user's issue
2. **Technical Details**: Gather specific technical information (error messages, steps to reproduce, environment)
3. **Impact Assessment**: Understand how this affects their work/business
4. **Desired Outcome**: What they want to achieve or have fixed
5. **Urgency**: How urgent this issue is for them

Ask ONE focused question at a time. Be empathetic and professional. Once you have gathered:
- Clear description of the issue
- Technical details (if applicable)
- Impact on user
- Desired resolution
- Urgency level

Respond with: "ISSUE_COMPLETE: [summary of all gathered information]"

Keep responses concise and helpful. Always acknowledge what the user has shared before asking the next question.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, issueId } = await req.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Prepare conversation history
    const conversationHistory = messages.map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Start chat with system prompt
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'ll help gather complete information about your issue before escalating it. What problem are you experiencing today?' }]
        },
        ...conversationHistory
      ]
    })

    const result = await chat.sendMessage(messages[messages.length - 1].content)
    const response = result.response.text()

    // Check if issue understanding is complete
    const isComplete = response.startsWith('ISSUE_COMPLETE:')
    
    return NextResponse.json({
      message: response,
      isComplete,
      issueId
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

