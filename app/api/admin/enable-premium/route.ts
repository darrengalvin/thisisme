import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint temporarily enables premium for dgalvin@yourcaio.co.uk
export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use auth.admin API to list users and find by email
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
      
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to list users', details: authError },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === 'dgalvin@yourcaio.co.uk')
    
    if (!user) {
      return NextResponse.json(
        { error: 'User dgalvin@yourcaio.co.uk not found in auth.users' },
        { status: 404 }
      )
    }

    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_tier: 'pro',
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_started_at: new Date().toISOString(),
          voice_transcription_minutes_limit: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update profile', details: updateError },
          { status: 500 }
        )
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          is_premium: true,
          subscription_tier: 'pro',
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_started_at: new Date().toISOString(),
          voice_transcription_minutes_limit: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create profile', details: insertError },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Premium enabled for dgalvin@yourcaio.co.uk',
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    console.error('Error enabling premium:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}