import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Temporary override for specific users
    const premiumUsers = ['dgalvin@yourcaio.co.uk', 'rod7goodman60@gmail.com', 'johntesty@testywesty.com'];
    if (premiumUsers.includes(user.email || '')) {
      return NextResponse.json({
        isPremium: true,
        tier: 'pro',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        features: {
          voiceTranscription: true,
          unlimitedMemories: true,
          advancedSearch: true,
          prioritySupport: true
        }
      })
    }

    // Check user's premium status in the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium, subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      // If profile doesn't exist or error, assume non-premium
      return NextResponse.json({
        isPremium: false,
        tier: 'free',
        features: {
          voiceTranscription: false,
          unlimitedMemories: false,
          advancedSearch: false,
          prioritySupport: false
        }
      })
    }

    // Check if subscription is still valid
    const isPremium = profile?.is_premium && 
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date())

    return NextResponse.json({
      isPremium: isPremium || false,
      tier: profile?.subscription_tier || 'free',
      expiresAt: profile?.subscription_expires_at || null,
      features: {
        voiceTranscription: isPremium,
        unlimitedMemories: isPremium,
        advancedSearch: isPremium,
        prioritySupport: isPremium
      }
    })

  } catch (error) {
    console.error('Error checking premium status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}