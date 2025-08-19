import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to manually test VAPI tools
export async function POST(request: NextRequest) {
  try {
    const { toolName, userId } = await request.json()
    
    console.log('🔧 DEBUG: Testing tool:', toolName, 'for user:', userId)
    
    // Create tool-specific test arguments
    let mockArguments = {}
    
    switch (toolName) {
      case 'get-user-context':
        mockArguments = {
          userId: userId,
          context_type: 'timeline_overview'
        }
        break
        
      case 'create-chapter':
        mockArguments = {
          userId: userId,
          title: 'Test Chapter from Debug',
          start_year: 2020,
          end_year: 2023,
          description: 'This is a test chapter created from the debug tools'
        }
        break
        
      case 'save-memory':
        mockArguments = {
          userId: userId,
          title: 'Test Memory',
          content: 'This is a test memory created from debug tools',
          year: 2022,
          age: 41,
          location: 'Test Location'
        }
        break
        
      case 'search-memories':
        mockArguments = {
          userId: userId,
          query: 'test'
        }
        break
        
      default:
        mockArguments = {
          userId: userId,
          context_type: 'timeline_overview'
        }
    }

    // Simulate a VAPI tool call
    const mockToolCall = {
      id: 'debug-tool-call-' + Date.now(),
      name: toolName,
      arguments: mockArguments
    }
    
    const mockCall = {
      id: 'debug-call-' + Date.now(),
      customer: { userId },
      metadata: { userId }
    }
    
    const mockBody = {
      message: {
        type: 'tool-calls',
        toolCallList: [mockToolCall]
      },
      call: mockCall
    }
    
    console.log('🔧 DEBUG: Mock VAPI body:', JSON.stringify(mockBody, null, 2))
    
    // Import the webhook handler
    const webhookModule = await import('../../vapi/webhook/route')
    
    // Create a mock request
    const mockRequest = new Request('https://thisisme-three.vercel.app/api/vapi/webhook?userId=' + userId + '&secret=dev-secret-123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBody)
    })
    
    // Call the webhook handler
    const response = await webhookModule.POST(mockRequest as NextRequest)
    const result = await response.json()
    
    console.log('🔧 DEBUG: Webhook response:', result)
    
    return NextResponse.json({
      success: true,
      toolName,
      userId,
      mockBody,
      webhookResponse: result
    })
    
  } catch (error) {
    console.error('🔧 DEBUG: Error testing tool:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'VAPI Tools Debug Endpoint',
    usage: 'POST with { toolName: "get-user-context", userId: "your-user-id" }'
  })
}
