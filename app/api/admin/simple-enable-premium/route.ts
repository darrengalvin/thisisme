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

    // Create Supabase client (using anon key like other endpoints)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('🔄 UPGRADE API: Processing upgrade for user:', userId, userEmail)
    
    // Update the user's profile to be premium
    const { error: updateError } = await supabase
      .from('profiles')
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
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update premium status', details: updateError },
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