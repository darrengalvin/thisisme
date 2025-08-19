import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const webhookUrl = 'https://thisisme-production.up.railway.app/vapi/webhook'
  
  console.log('🔍 Testing webhook reachability...')
  console.log('🔍 Webhook URL:', webhookUrl)
  
  try {
    // Test if our webhook endpoint is reachable
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          type: 'test',
          content: 'Testing webhook reachability'
        },
        call: {
          id: 'test-call-123',
          customer: {
            userId: 'test-user-123'
          }
        }
      })
    })
    
    const responseText = await response.text()
    
    return NextResponse.json({
      success: true,
      webhookUrl,
      reachable: response.ok,
      status: response.status,
      response: responseText,
      message: response.ok ? 'Webhook is reachable!' : 'Webhook returned an error'
    })
    
  } catch (error) {
    console.error('🔍 Webhook test failed:', error)
    return NextResponse.json({
      success: false,
      webhookUrl,
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Webhook is not reachable - this could be why VAPI cannot call it'
    })
  }
}
