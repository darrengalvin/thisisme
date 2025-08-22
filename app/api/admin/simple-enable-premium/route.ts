import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
    // Verify and decode the JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key')
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError)
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const userEmail = decoded.email

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token - no user ID' },
        { status: 401 }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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