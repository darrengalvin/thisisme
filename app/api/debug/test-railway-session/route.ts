import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No sessionId provided' }, { status: 400 });
    }
    
    // Test Railway webhook with session
    const railwayUrl = 'https://thisisme-production.up.railway.app/vapi/webhook';
    
    const testPayload = {
      message: {
        type: 'tool-calls',
        toolCallList: [{
          id: `test-${Date.now()}`,
          name: 'get-user-context',
          arguments: {}
        }],
        call: {
          metadata: {
            sessionId: sessionId
          }
        }
      }
    };
    
    console.log('🧪 Testing Railway with session:', sessionId);
    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(railwayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      sessionId,
      railwayResponse: result,
      test: {
        url: railwayUrl,
        payload: testPayload
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Railway test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}