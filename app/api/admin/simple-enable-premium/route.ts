import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      )
    }

    // Update the user's profile to be premium
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        is_premium: true,
        subscription_tier: 'pro',
        subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update premium status', details: updateError },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Premium features are now enabled for ${user.email}`,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      features: {
        voiceTranscription: true,
        unlimitedMemories: true,
        advancedSearch: true,
        prioritySupport: true
      }
    })

  } catch (error) {
    console.error('Error in simple-enable-premium:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}