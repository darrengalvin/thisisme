import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

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

    // Get user profile for personalization
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year')
      .eq('id', user.userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userName = userProfile.email?.split('@')[0] || 'there'
    const currentYear = new Date().getFullYear()
    const currentAge = userProfile.birth_year ? currentYear - userProfile.birth_year : null

    // VAPI configuration using customer field (VAPI's recommended approach)
    const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '8ceaceba-6047-4965-92c5-225d0ebc1c4f'
    
    const vapiCallConfig = {
      assistantId: VAPI_ASSISTANT_ID,
      // This is the key part - VAPI will include this customer object in webhook calls
      customer: {
        userId: user.userId,
        email: user.email,
        name: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      },
      // Additional metadata (also included in webhook calls)
      metadata: {
        userId: user.userId,
        userEmail: user.email,
        userName: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        name: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      },
      vapiConfig: vapiCallConfig,
      // Instructions for frontend
      instructions: {
        message: "Use this config when creating a VAPI call. The customer.userId will be available in webhook calls.",
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thisisme-three.vercel.app'}/api/vapi/webhook`,
        example: "vapi.start(vapiConfig) - Maya will know it's you from the customer.userId field"
      },
      greeting: `Hi ${userName}! I'm Maya, your memory assistant. I know you were born in ${userProfile.birth_year}, so you're currently ${currentAge}. I'm ready to help you capture and organize your memories!`
    })

  } catch (error) {
    console.error('Error starting VAPI call:', error)
    return NextResponse.json(
      { error: 'Failed to start voice chat' },
      { status: 500 }
    )
  }
}
