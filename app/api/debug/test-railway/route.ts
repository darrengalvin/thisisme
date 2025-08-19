import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 Testing Railway webhook with your user ID...')
  
  try {
    const response = await fetch('https://thisisme-production.up.railway.app/vapi/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          type: 'tool-calls',
          toolCallList: [{
            id: 'test-123',
            name: 'get-user-context',
            arguments: { context_type: 'timeline_overview' }
          }]
        },
        call: {
          assistantOverrides: {
            metadata: {
              userId: '9a9c09ee-8d59-450b-bf43-58ee373621b8'
            }
          }
        }
      })
    })
    
    const result = await response.text()
    
    return NextResponse.json({
      success: true,
      status: response.status,
      railwayResponse: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🧪 Railway test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
