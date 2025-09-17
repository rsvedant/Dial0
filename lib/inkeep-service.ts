import OpenAI from 'openai'

// Inkeep API configuration
const INKEEP_BASE_URL = 'https://api.inkeep.com/v1'

// Initialize OpenAI client configured for Inkeep
const inkeepClient = new OpenAI({
  apiKey: process.env.INKEEP_API_KEY!,
  baseURL: INKEEP_BASE_URL,
})

// Available Inkeep models
export const INKEEP_MODELS = {
  QA: 'inkeep-qa-expert',           // Optimized for customer-facing support
  CONTEXT: 'inkeep-context',        // Injects RAG context into calls
  BASE: 'inkeep-base',             // Faster version without RAG
  RAG: 'inkeep-rag',               // Provides structured RAG chunks
} as const

// Types for Inkeep integration
export interface InkeepAnalysisRequest {
  issueDetails: string
  userQuery: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  urgency: 'immediate' | 'same-day' | 'next-business-day' | 'when-available'
}

export interface InkeepAnalysisResponse {
  confidence: number
  relevantDocs: string[]
  suggestedSolution: string
  escalationRecommended: boolean
  estimatedResolutionTime: string
  assignedTeam: string
  tags: string[]
  ragContext?: any[]
  reasoning: string
}

export interface InkeepSearchRequest {
  query: string
  maxResults?: number
  includeContext?: boolean
}

export interface InkeepSearchResponse {
  results: Array<{
    title: string
    content: string
    url?: string
    relevanceScore: number
  }>
  totalResults: number
}

/**
 * Analyzes a user issue using Inkeep's QA model
 */
export async function analyzeIssueWithInkeep(
  request: InkeepAnalysisRequest
): Promise<InkeepAnalysisResponse> {
  try {
    const systemPrompt = `You are an expert customer support AI assistant powered by Inkeep's knowledge base. 

Your task is to analyze customer issues and provide comprehensive support recommendations.

For the given issue, provide:
1. A confidence score (0-1) for how well you can address this issue
2. Relevant documentation references from the knowledge base
3. A suggested solution or next steps
4. Whether human escalation is recommended
5. Estimated resolution time
6. The most appropriate team to handle this
7. Relevant tags for categorization
8. Your reasoning for the recommendations

Format your response as a JSON object with these exact keys:
- confidence (number 0-1)
- relevantDocs (array of strings)
- suggestedSolution (string)
- escalationRecommended (boolean)
- estimatedResolutionTime (string)
- assignedTeam (string)
- tags (array of strings)
- reasoning (string)

Issue Details:
- Category: ${request.category}
- Priority: ${request.priority}
- Urgency: ${request.urgency}
- User Query: ${request.userQuery}
- Full Issue: ${request.issueDetails}`

    const completion = await inkeepClient.chat.completions.create({
      model: INKEEP_MODELS.QA,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please analyze this issue: ${request.issueDetails}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from Inkeep API')
    }

    // Try to parse JSON response
    let analysisResult: InkeepAnalysisResponse
    try {
      analysisResult = JSON.parse(responseContent)
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      console.warn('Failed to parse Inkeep JSON response, creating structured response')
      analysisResult = {
        confidence: 0.8,
        relevantDocs: ['General Documentation', 'Support Guidelines'],
        suggestedSolution: responseContent,
        escalationRecommended: request.priority === 'urgent' || request.urgency === 'immediate',
        estimatedResolutionTime: getDefaultResolutionTime(request.priority),
        assignedTeam: getDefaultTeam(request.category),
        tags: [request.category.toLowerCase(), request.priority],
        reasoning: 'Analysis based on Inkeep AI response'
      }
    }

    return analysisResult

  } catch (error) {
    console.error('Inkeep analysis error:', error)
    
    // Return fallback response
    return {
      confidence: 0.5,
      relevantDocs: ['General Support Documentation'],
      suggestedSolution: 'We are analyzing your issue and will provide a detailed response shortly. Our team has been notified.',
      escalationRecommended: request.priority === 'urgent',
      estimatedResolutionTime: getDefaultResolutionTime(request.priority),
      assignedTeam: getDefaultTeam(request.category),
      tags: [request.category.toLowerCase(), 'needs-review'],
      reasoning: 'Fallback response due to API error'
    }
  }
}

/**
 * Search Inkeep knowledge base for relevant information
 */
export async function searchInkeepKnowledgeBase(
  request: InkeepSearchRequest
): Promise<InkeepSearchResponse> {
  try {
    const model = request.includeContext ? INKEEP_MODELS.RAG : INKEEP_MODELS.BASE

    const completion = await inkeepClient.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a knowledge base search assistant. Search for information related to the user's query and return relevant results in JSON format.

Format your response as a JSON object with:
- results: array of objects with title, content, url (if available), and relevanceScore (0-1)
- totalResults: number

Limit results to ${request.maxResults || 5} items.`
        },
        {
          role: 'user',
          content: `Search for: ${request.query}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from Inkeep search')
    }

    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      // Fallback response
      return {
        results: [{
          title: 'Search Results',
          content: responseContent,
          relevanceScore: 0.8
        }],
        totalResults: 1
      }
    }

  } catch (error) {
    console.error('Inkeep search error:', error)
    return {
      results: [],
      totalResults: 0
    }
  }
}

/**
 * Get contextual information from Inkeep for a specific topic
 */
export async function getInkeepContext(topic: string): Promise<string> {
  try {
    const completion = await inkeepClient.chat.completions.create({
      model: INKEEP_MODELS.CONTEXT,
      messages: [
        {
          role: 'system',
          content: 'Provide relevant context and information about the requested topic from the knowledge base.'
        },
        {
          role: 'user',
          content: `Provide context about: ${topic}`
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
    })

    return completion.choices[0]?.message?.content || 'No context available'

  } catch (error) {
    console.error('Inkeep context error:', error)
    return 'Context temporarily unavailable'
  }
}

// Helper functions
function getDefaultResolutionTime(priority: string): string {
  const timeMap: Record<string, string> = {
    'urgent': '1-2 hours',
    'high': '4-8 hours',
    'medium': '1-2 business days',
    'low': '2-3 business days'
  }
  return timeMap[priority] || '1-2 business days'
}

function getDefaultTeam(category: string): string {
  const teamMap: Record<string, string> = {
    'Authentication': 'Security Team',
    'Billing': 'Finance Team',
    'Technical Issue': 'Engineering Team',
    'Feature Request': 'Product Team',
    'Account Management': 'Customer Success',
    'Integration Support': 'Developer Relations'
  }
  return teamMap[category] || 'General Support'
}

/**
 * Validate Inkeep API connection
 */
export async function validateInkeepConnection(): Promise<boolean> {
  try {
    const completion = await inkeepClient.chat.completions.create({
      model: INKEEP_MODELS.BASE,
      messages: [
        {
          role: 'user',
          content: 'Hello, this is a connection test.'
        }
      ],
      max_tokens: 50,
    })

    return !!completion.choices[0]?.message?.content
  } catch (error) {
    console.error('Inkeep connection validation failed:', error)
    return false
  }
}
