import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contextType, context_type } = body
    
    const actualContextType = contextType || context_type
    
    return NextResponse.json({
      received: body,
      contextType,
      context_type,
      actualContextType,
      isConversationHistory: actualContextType === 'conversation_history',
      stringComparison: {
        actualValue: actualContextType,
        expectedValue: 'conversation_history',
        match: actualContextType === 'conversation_history',
        actualLength: actualContextType?.length,
        expectedLength: 'conversation_history'.length,
        actualType: typeof actualContextType
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to test context', details: error }, { status: 500 })
  }
}
