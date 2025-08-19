import { NextRequest, NextResponse } from 'next/server'
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

// Create a client for verifying user tokens
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get the logged-in user from their Supabase session token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify the Supabase session token
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
    
    if (error || !user) {
      console.error('🎤 Authentication failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('🎤 Starting VAPI call for user:', user.id, user.email)

    // Get user profile for personalization
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year')
      .eq('id', user.id)
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
        userId: user.id,
        email: user.email,
        name: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      },
      // Additional metadata (also included in webhook calls)
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userName: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      }
    }

    // Log the configuration being sent
    console.log('🎤 VAPI START-CALL: Sending configuration to frontend')
    console.log('🎤 Assistant ID:', VAPI_ASSISTANT_ID)
    console.log('🎤 User ID:', user.id)
    console.log('🎤 Webhook URL:', `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thisisme-m2ku5utm7-darrengalvins-projects.vercel.app'}/api/vapi/webhook?userId=${user.id}&x-vercel-protection-bypass=${process.env.VERCEL_PROTECTION_BYPASS_SECRET || ''}`)
    console.log('🎤 Customer data:', vapiCallConfig.customer)
    console.log('🎤 Metadata:', vapiCallConfig.metadata)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        birthYear: userProfile.birth_year,
        currentAge: currentAge
      },
      vapiConfig: vapiCallConfig,
      // Instructions for frontend
      instructions: {
        message: "Use this config when creating a VAPI call. The customer.userId will be available in webhook calls.",
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thisisme-m2ku5utm7-darrengalvins-projects.vercel.app'}/api/vapi/webhook?userId=${user.id}&x-vercel-protection-bypass=${process.env.VERCEL_PROTECTION_BYPASS_SECRET || ''}`,
        example: "vapi.start(vapiConfig) - Maya will know it's you from the customer.userId field"
      },
      greeting: `Hi ${userName}! I'm Maya, your memory assistant. I know you were born in ${userProfile.birth_year}, so you're currently ${currentAge}. I'm ready to help you capture and organize your memories!`,
      // Add debugging info
      debug: {
        assistantId: VAPI_ASSISTANT_ID,
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thisisme-m2ku5utm7-darrengalvins-projects.vercel.app'}/api/vapi/webhook?userId=${user.id}&x-vercel-protection-bypass=${process.env.VERCEL_PROTECTION_BYPASS_SECRET || ''}`,
        toolsConfigured: "Check VAPI dashboard to ensure tools are configured for this assistant",
        expectedWebhookCalls: "Maya should call webhook when she tries to use tools"
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
