import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 UPGRADE API: Starting premium upgrade process')
    
    // Extract token from Authorization header (same pattern as working APIs)
    const authHeader = request.headers.get('authorization')
    console.log('🔐 UPGRADE API AUTH HEADER:', authHeader ? 'Present' : 'Missing')
    
    const token = extractTokenFromHeader(authHeader || undefined)
    console.log('🎟️ UPGRADE API TOKEN:', token ? 'Present' : 'Missing')
    
    if (!token) {
      console.log('❌ UPGRADE API: No token found in request')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    console.log('👤 UPGRADE API USER:', user ? `Success: ${user.userId}` : 'Failed')
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.userId
    const userEmail = user.email

    console.log('🔍 UPGRADE API: Auth successful for user:', userId, userEmail)

    // Create Supabase client with service role key to bypass RLS for admin operations
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

    console.log('🔄 UPGRADE API: Processing upgrade for user:', userId, userEmail)
    
    // Update the user's profile to be premium (using 'users' table, not 'profiles')
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userEmail,
        is_premium: true,
        subscription_tier: 'pro',
        subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (updateError) {
      console.error('❌ UPGRADE API: Database update failed:', updateError)
      console.error('❌ UPGRADE API: Error details:', JSON.stringify(updateError, null, 2))
      console.error('❌ UPGRADE API: User data attempted:', { userId, userEmail })
      return NextResponse.json(
        { 
          error: 'Failed to update premium status', 
          details: updateError,
          userId: userId,
          userEmail: userEmail 
        },
        { status: 500 }
      )
    }
    
    console.log('✅ UPGRADE API: Successfully upgraded user to premium')
    
    return NextResponse.json({
      success: true,
      message: `Premium features are now enabled for ${userEmail}`,
      userId: userId,
      email: userEmail,
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