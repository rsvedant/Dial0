import { NextRequest, NextResponse } from 'next/server'
import { 
  analyzeIssueWithInkeep, 
  searchInkeepKnowledgeBase,
  validateInkeepConnection,
  type InkeepAnalysisRequest 
} from '@/lib/inkeep-service'

export async function POST(req: NextRequest) {
  try {
    const { issueDetails, userQuery } = await req.json()

    console.log('Processing issue for Inkeep:', issueDetails)

    // Validate Inkeep connection first
    if (!process.env.INKEEP_API_KEY) {
      return NextResponse.json(
        { error: 'Inkeep API key not configured' },
        { status: 500 }
      )
    }

    const isConnected = await validateInkeepConnection()
    if (!isConnected) {
      console.warn('Inkeep connection failed, using fallback')
    }

    // Step 1: Process the issue details and categorize
    const processedIssue = {
      originalIssue: issueDetails,
      userQuery,
      priority: determinePriority(issueDetails),
      category: extractIssueType(issueDetails),
      timestamp: new Date().toISOString(),
      urgency: determineUrgency(issueDetails)
    }

    // Step 2: Send to Inkeep AI Agent for real analysis
    const inkeepAnalysisRequest: InkeepAnalysisRequest = {
      issueDetails,
      userQuery,
      priority: processedIssue.priority,
      category: processedIssue.category,
      urgency: processedIssue.urgency
    }

    const inkeepResponse = isConnected 
      ? await analyzeIssueWithInkeep(inkeepAnalysisRequest)
      : await sendToInkeepFallback(processedIssue)

    // Step 3: Search knowledge base for additional context
    let knowledgeBaseResults = null
    if (isConnected) {
      try {
        knowledgeBaseResults = await searchInkeepKnowledgeBase({
          query: userQuery,
          maxResults: 3,
          includeContext: true
        })
      } catch (error) {
        console.warn('Knowledge base search failed:', error)
      }
    }

    // Step 4: Based on Inkeep's analysis, determine if human escalation is needed
    const needsHumanEscalation = shouldEscalateToHuman(processedIssue, inkeepResponse)

    let vapiResponse = null
    if (needsHumanEscalation) {
      // Step 5: Trigger Vapi to contact the appropriate person (placeholder for now)
      vapiResponse = await triggerVapiCall(processedIssue, inkeepResponse)
    }

    const response = {
      success: true,
      message: formatResponseMessage(processedIssue, inkeepResponse, vapiResponse, knowledgeBaseResults),
      inkeepAnalysis: inkeepResponse,
      knowledgeBaseResults,
      humanEscalationTriggered: needsHumanEscalation,
      vapiCall: vapiResponse,
      estimatedResponseTime: vapiResponse?.estimatedTime || inkeepResponse.estimatedResolutionTime,
      processedIssue,
      usingRealInkeep: isConnected
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Inkeep API error:', error)
    return NextResponse.json(
      { error: 'Failed to process with Inkeep' },
      { status: 500 }
    )
  }
}

// Helper functions
function extractIssueType(issueDetails: string): string {
  const lowerDetails = issueDetails.toLowerCase()
  
  if (lowerDetails.includes('login') || lowerDetails.includes('authentication') || lowerDetails.includes('signin')) {
    return 'Authentication'
  } else if (lowerDetails.includes('payment') || lowerDetails.includes('billing') || lowerDetails.includes('subscription')) {
    return 'Billing'
  } else if (lowerDetails.includes('bug') || lowerDetails.includes('error') || lowerDetails.includes('broken') || lowerDetails.includes('not working')) {
    return 'Technical Issue'
  } else if (lowerDetails.includes('feature') || lowerDetails.includes('request') || lowerDetails.includes('enhancement')) {
    return 'Feature Request'
  } else if (lowerDetails.includes('account') || lowerDetails.includes('profile') || lowerDetails.includes('settings')) {
    return 'Account Management'
  } else if (lowerDetails.includes('integration') || lowerDetails.includes('api') || lowerDetails.includes('webhook')) {
    return 'Integration Support'
  }
  
  return 'General Support'
}

function determinePriority(issueDetails: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lowerDetails = issueDetails.toLowerCase()
  
  if (lowerDetails.includes('urgent') || lowerDetails.includes('critical') || lowerDetails.includes('down') || lowerDetails.includes('outage')) {
    return 'urgent'
  } else if (lowerDetails.includes('important') || lowerDetails.includes('asap') || lowerDetails.includes('blocking')) {
    return 'high'
  } else if (lowerDetails.includes('when possible') || lowerDetails.includes('low priority') || lowerDetails.includes('minor')) {
    return 'low'
  }
  
  return 'medium'
}

function determineUrgency(issueDetails: string): 'immediate' | 'same-day' | 'next-business-day' | 'when-available' {
  const lowerDetails = issueDetails.toLowerCase()
  
  if (lowerDetails.includes('emergency') || lowerDetails.includes('critical') || lowerDetails.includes('production down')) {
    return 'immediate'
  } else if (lowerDetails.includes('urgent') || lowerDetails.includes('today') || lowerDetails.includes('asap')) {
    return 'same-day'
  } else if (lowerDetails.includes('tomorrow') || lowerDetails.includes('next day')) {
    return 'next-business-day'
  }
  
  return 'when-available'
}

async function sendToInkeepFallback(processedIssue: any) {
  // Fallback function when Inkeep API is not available
  console.log('Using Inkeep fallback for:', processedIssue)
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // Simulate Inkeep AI analysis based on issue type and content
  const mockAnalysis = {
    confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    relevantDocs: generateRelevantDocs(processedIssue.category),
    suggestedSolution: generateSuggestedSolution(processedIssue.category, processedIssue.originalIssue),
    escalationRecommended: processedIssue.priority === 'urgent' || processedIssue.urgency === 'immediate',
    estimatedResolutionTime: getEstimatedResolutionTime(processedIssue.category, processedIssue.priority),
    assignedTeam: getAssignedTeam(processedIssue.category),
    tags: generateTags(processedIssue.originalIssue),
    reasoning: 'Fallback analysis - Inkeep API not available'
  }
  
  return mockAnalysis
}

function shouldEscalateToHuman(processedIssue: any, inkeepResponse: any): boolean {
  // Escalate if:
  // 1. Inkeep recommends escalation
  // 2. Priority is urgent
  // 3. Confidence is low
  // 4. Issue type requires human intervention
  
  return inkeepResponse.escalationRecommended || 
         processedIssue.priority === 'urgent' ||
         inkeepResponse.confidence < 0.75 ||
         ['Billing', 'Account Management'].includes(processedIssue.category)
}

async function triggerVapiCall(processedIssue: any, inkeepResponse: any) {
  // This would integrate with Vapi to make the actual call
  console.log('Triggering Vapi call for human escalation:', { processedIssue, inkeepResponse })
  
  // Simulate Vapi call setup
  await new Promise(resolve => setTimeout(resolve, 1200))
  
  const contactPerson = getContactPerson(processedIssue.category, inkeepResponse.assignedTeam)
  
  return {
    success: true,
    callId: `vapi_${Date.now()}`,
    contactPerson,
    estimatedTime: processedIssue.urgency === 'immediate' ? '1-2 minutes' : 
                   processedIssue.urgency === 'same-day' ? '2-5 minutes' : '5-15 minutes',
    message: `Vapi call initiated to ${contactPerson.name} (${contactPerson.role})`,
    callType: processedIssue.urgency === 'immediate' ? 'emergency' : 'standard'
  }
}

function formatResponseMessage(processedIssue: any, inkeepResponse: any, vapiResponse: any, knowledgeBaseResults: any): string {
  let message = `✅ Your ${processedIssue.category.toLowerCase()} issue has been analyzed!\n\n`
  
  message += `📊 **Analysis Results:**\n`
  message += `• Priority: ${processedIssue.priority.toUpperCase()}\n`
  message += `• Confidence: ${Math.round(inkeepResponse.confidence * 100)}%\n`
  message += `• Assigned Team: ${inkeepResponse.assignedTeam}\n\n`
  
  if (inkeepResponse.suggestedSolution) {
    message += `💡 **Suggested Solution:**\n${inkeepResponse.suggestedSolution}\n\n`
  }
  
  if (inkeepResponse.relevantDocs && inkeepResponse.relevantDocs.length > 0) {
    message += `📚 **Relevant Documentation:**\n`
    inkeepResponse.relevantDocs.forEach((doc: string, index: number) => {
      message += `${index + 1}. ${doc}\n`
    })
    message += `\n`
  }
  
  // Add knowledge base results if available
  if (knowledgeBaseResults && knowledgeBaseResults.results && knowledgeBaseResults.results.length > 0) {
    message += `🔍 **Knowledge Base Results:**\n`
    knowledgeBaseResults.results.forEach((result: any, index: number) => {
      message += `${index + 1}. ${result.title} (${Math.round(result.relevanceScore * 100)}% relevant)\n`
    })
    message += `\n`
  }
  
  if (vapiResponse) {
    message += `📞 **Human Support Initiated:**\n`
    message += `• Contact: ${vapiResponse.contactPerson.name} (${vapiResponse.contactPerson.role})\n`
    message += `• Expected Response: ${vapiResponse.estimatedTime}\n`
    message += `• Call ID: ${vapiResponse.callId}\n`
  } else {
    message += `🤖 **AI Resolution Available:**\n`
    message += `• Estimated Resolution: ${inkeepResponse.estimatedResolutionTime}\n`
    message += `• No human escalation needed at this time\n`
  }
  
  // Add reasoning if available
  if (inkeepResponse.reasoning) {
    message += `\n🧠 **AI Reasoning:**\n${inkeepResponse.reasoning}\n`
  }
  
  return message
}

// Utility functions for generating mock responses
function generateRelevantDocs(category: string): string[] {
  const docMap: Record<string, string[]> = {
    'Authentication': [
      'Login Troubleshooting Guide',
      'Password Reset Instructions',
      'Two-Factor Authentication Setup'
    ],
    'Billing': [
      'Billing FAQ',
      'Subscription Management',
      'Payment Method Updates'
    ],
    'Technical Issue': [
      'Common Error Solutions',
      'System Status Page',
      'Browser Compatibility Guide'
    ],
    'Feature Request': [
      'Feature Request Process',
      'Roadmap Updates',
      'Beta Program Information'
    ],
    'Account Management': [
      'Account Settings Guide',
      'Profile Management',
      'Data Export Instructions'
    ],
    'Integration Support': [
      'API Documentation',
      'Webhook Setup Guide',
      'Integration Examples'
    ]
  }
  
  return docMap[category] || ['General Help Center', 'Contact Support']
}

function generateSuggestedSolution(category: string, issueDetails: string): string {
  const solutionMap: Record<string, string> = {
    'Authentication': 'Try clearing your browser cache and cookies, then attempt to log in again. If the issue persists, use the "Forgot Password" link.',
    'Billing': 'Check your payment method on file and ensure it\'s up to date. Contact billing support if charges appear incorrect.',
    'Technical Issue': 'Please try refreshing the page and check if the issue persists. Clear your browser cache if needed.',
    'Feature Request': 'Thank you for the suggestion! We\'ll review this for potential inclusion in our roadmap.',
    'Account Management': 'You can manage most account settings from your profile page. Contact support for sensitive changes.',
    'Integration Support': 'Please check our API documentation and ensure you\'re using the latest endpoints and authentication methods.'
  }
  
  return solutionMap[category] || 'Our team will review your issue and provide a customized solution.'
}

function getEstimatedResolutionTime(category: string, priority: string): string {
  if (priority === 'urgent') return '1-2 hours'
  if (priority === 'high') return '4-8 hours'
  
  const timeMap: Record<string, string> = {
    'Authentication': '15-30 minutes',
    'Billing': '1-2 business days',
    'Technical Issue': '2-4 hours',
    'Feature Request': '2-4 weeks (review)',
    'Account Management': '1-2 hours',
    'Integration Support': '4-8 hours'
  }
  
  return timeMap[category] || '1-2 business days'
}

function getAssignedTeam(category: string): string {
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

function getContactPerson(category: string, team: string): { name: string, role: string, phone: string } {
  const contactMap: Record<string, { name: string, role: string, phone: string }> = {
    'Security Team': { name: 'Alex Chen', role: 'Security Specialist', phone: '+1-555-0101' },
    'Finance Team': { name: 'Sarah Johnson', role: 'Billing Specialist', phone: '+1-555-0102' },
    'Engineering Team': { name: 'Mike Rodriguez', role: 'Senior Engineer', phone: '+1-555-0103' },
    'Product Team': { name: 'Emily Davis', role: 'Product Manager', phone: '+1-555-0104' },
    'Customer Success': { name: 'David Kim', role: 'Customer Success Manager', phone: '+1-555-0105' },
    'Developer Relations': { name: 'Lisa Wang', role: 'Developer Advocate', phone: '+1-555-0106' }
  }
  
  return contactMap[team] || { name: 'Support Agent', role: 'General Support', phone: '+1-555-0100' }
}

function generateTags(issueDetails: string): string[] {
  const tags = []
  const lowerDetails = issueDetails.toLowerCase()
  
  if (lowerDetails.includes('mobile')) tags.push('mobile')
  if (lowerDetails.includes('web') || lowerDetails.includes('browser')) tags.push('web')
  if (lowerDetails.includes('api')) tags.push('api')
  if (lowerDetails.includes('slow') || lowerDetails.includes('performance')) tags.push('performance')
  if (lowerDetails.includes('error') || lowerDetails.includes('bug')) tags.push('bug')
  if (lowerDetails.includes('new') || lowerDetails.includes('first time')) tags.push('new-user')
  
  return tags.length > 0 ? tags : ['general']
}
