import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing email' },
        { status: 400 }
      )
    }
    
    // Check for admin impersonation
    const cookieStore = cookies()
    const impersonatingUserId = cookieStore.get('impersonating-user-id')?.value
    const adminUserId = cookieStore.get('admin-user-id')?.value
    
    console.log('🎭 TOKEN API: Checking impersonation:', { 
      requestUserId: userId, 
      adminUserId, 
      impersonatingUserId 
    })
    
    let tokenUserId = userId
    let tokenEmail = email
    
    // If admin is impersonating, use the target user's details
    if (impersonatingUserId && adminUserId && userId === adminUserId) {
      console.log('🎭 TOKEN API: Admin impersonating, switching token to target user')
      tokenUserId = impersonatingUserId
      
      // Get the impersonated user's email
      const impersonatingUserEmail = cookieStore.get('impersonating-user-email')?.value
      if (impersonatingUserEmail) {
        tokenEmail = impersonatingUserEmail
      }
    }
    
    // If tokenUserId is 'existing-user', look up the actual user by email
    if (tokenUserId === 'existing-user') {
      // Create Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', tokenEmail)
        .maybeSingle()
      
      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      
      tokenUserId = user.id
    }
    
    if (!tokenUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      )
    }
    
    // Generate JWT token
    const token = await generateToken({ id: tokenUserId, email: tokenEmail })
    
    console.log('🎭 TOKEN API: Generated token for:', { userId: tokenUserId, email: tokenEmail })
    
    return NextResponse.json({
      success: true,
      token
    })
  } catch (error) {
    console.error('Error generating token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    )
  }
} 