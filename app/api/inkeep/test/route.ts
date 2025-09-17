import { NextRequest, NextResponse } from 'next/server'
import { validateInkeepConnection, searchInkeepKnowledgeBase, getInkeepContext } from '@/lib/inkeep-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const testType = searchParams.get('type') || 'connection'

    switch (testType) {
      case 'connection':
        const isConnected = await validateInkeepConnection()
        return NextResponse.json({
          success: isConnected,
          message: isConnected ? 'Inkeep connection successful' : 'Inkeep connection failed',
          timestamp: new Date().toISOString()
        })

      case 'search':
        const query = searchParams.get('query') || 'test search'
        const searchResults = await searchInkeepKnowledgeBase({
          query,
          maxResults: 3,
          includeContext: true
        })
        return NextResponse.json({
          success: true,
          query,
          results: searchResults,
          timestamp: new Date().toISOString()
        })

      case 'context':
        const topic = searchParams.get('topic') || 'general help'
        const context = await getInkeepContext(topic)
        return NextResponse.json({
          success: true,
          topic,
          context,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid test type. Use: connection, search, or context',
          availableTypes: ['connection', 'search', 'context']
        })
    }

  } catch (error) {
    console.error('Inkeep test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { testQuery } = await req.json()

    if (!testQuery) {
      return NextResponse.json(
        { error: 'testQuery is required' },
        { status: 400 }
      )
    }

    // Test the full analysis flow
    const testIssue = {
      issueDetails: testQuery,
      userQuery: testQuery,
      priority: 'medium' as const,
      category: 'Technical Issue',
      urgency: 'same-day' as const
    }

    const analysisResult = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/inkeep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issueDetails: testQuery,
        userQuery: testQuery
      })
    })

    const analysisData = await analysisResult.json()

    return NextResponse.json({
      success: true,
      testQuery,
      analysisResult: analysisData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Inkeep POST test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'POST test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
