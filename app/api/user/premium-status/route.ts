import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 PREMIUM STATUS API: Starting premium status check')
    
    // Try JWT token authentication first (same as upgrade API)
    const authHeader = request.headers.get('authorization')
    console.log('🔐 PREMIUM STATUS API: Auth header present:', !!authHeader)
    
    let userId: string | null = null
    let userEmail: string | null = null
    
    if (authHeader) {
      // JWT token authentication
      const token = extractTokenFromHeader(authHeader)
      console.log('🎟️ PREMIUM STATUS API: Token extracted:', !!token)
      
      if (token) {
        const user = await verifyToken(token)
        console.log('👤 PREMIUM STATUS API: JWT user verified:', !!user)
        
        if (user) {
          userId = user.userId
          userEmail = user.email
        }
      }
    }
    
    // Fallback to cookie authentication if JWT fails
    if (!userId) {
      console.log('🔄 PREMIUM STATUS API: Falling back to cookie authentication')
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
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
      console.log('👤 PREMIUM STATUS API: Cookie user verified:', !!user)
      
      if (user && !authError) {
        userId = user.id
        userEmail = user.email || null
      }
    }
    
    if (!userId) {
      console.log('❌ PREMIUM STATUS API: No valid authentication found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('✅ PREMIUM STATUS API: Authentication successful for:', userId, userEmail)

    // Remove hardcoded email restrictions - RODINVITE code should work for anyone
    // Premium status is now determined purely by database records

    // Create Supabase client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔍 PREMIUM STATUS API: Checking premium status in database for user:', userId)

    // Check user's premium status in the database (using 'users' table, not 'profiles')
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_premium, subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single()

    console.log('📊 PREMIUM STATUS API: Database query result:', { profile, error: profileError })

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      // If user doesn't have premium fields, create a basic record
      // This ensures the upgrade process can work later
      const { error: createError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
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