import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get the logged-in user from their auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = await verifyToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('🎤 Starting VAPI call for user:', user.userId, user.email)

    // Create the authenticated webhook URL for this specific user
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thisisme-three.vercel.app'}/api/vapi/webhook?userId=${user.userId}`

    // Here you would integrate with VAPI SDK to start the call
    // For now, we'll return the configuration needed
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        email: user.email
      },
      vapiConfig: {
        assistantId: process.env.VAPI_ASSISTANT_ID || '8ceaceba-6047-4965-92c5-225d0ebc1c4f',
        webhookUrl: webhookUrl,
        greeting: `Hi ${user.email?.split('@')[0] || 'there'}! I'm Maya, ready to help you capture some memories. What's on your mind today?`
      }
    })

  } catch (error) {
    console.error('Error starting VAPI call:', error)
    return NextResponse.json(
      { error: 'Failed to start voice chat' },
      { status: 500 }
    )
  }
}
