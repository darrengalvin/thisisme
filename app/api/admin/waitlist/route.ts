import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get all waitlist entries
export async function GET(request: NextRequest) {
  try {
    const { data: entries, error } = await supabase
      .from('premium_waitlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching waitlist entries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch waitlist entries' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Error in waitlist GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add new waitlist entry
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('premium_waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Email already on waitlist' },
        { status: 409 }
      )
    }

    // Add to waitlist
    const { data: entry, error } = await supabase
      .from('premium_waitlist')
      .insert([
        {
          email: email.toLowerCase(),
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error adding to waitlist:', error)
      return NextResponse.json(
        { error: 'Failed to add to waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully added to waitlist',
      entry 
    })
  } catch (error) {
    console.error('Error in waitlist POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
