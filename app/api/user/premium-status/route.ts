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

    // Remove hardcoded email restrictions - RODINVITE code should work for anyone
    // Premium status is now determined purely by database records

    // Check user's premium status in the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium, subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      // If profile doesn't exist, create a basic one and assume non-premium
      // This ensures the upgrade process can work later
      const { error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          is_premium: false,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
      
      if (createError) {
        console.error('Error creating profile:', createError)
      }
      
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