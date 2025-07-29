import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing email' },
        { status: 400 }
      )
    }
    
    let tokenUserId = userId
    
    // If userId is 'existing-user', look up the actual user by email
    if (userId === 'existing-user') {
      // Create Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
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
    const token = await generateToken({ id: tokenUserId, email })
    
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