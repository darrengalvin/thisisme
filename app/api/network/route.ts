import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Get user's personal network
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 NETWORK API: Starting GET request')
    
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ NETWORK API: No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 NETWORK API: Verifying token...')
    
    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ NETWORK API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ NETWORK API: Token verified for user:', user.userId)

    console.log('🔍 NETWORK API: Querying user_networks table...')
    const { data: networkPeople, error } = await supabaseAdmin
      .from('user_networks')
      .select('*')
      .eq('owner_id', user.userId)
      .order('person_name')

    if (error) {
      console.error('❌ NETWORK API: Database error:', error)
      throw error
    }

    console.log('✅ NETWORK API: Query successful, found', networkPeople?.length || 0, 'people')

    return NextResponse.json({
      success: true,
      people: networkPeople || []
    })
  } catch (error) {
    console.error('❌ NETWORK API: Failed to fetch user network:', error)
    return NextResponse.json(
      { error: 'Failed to fetch network' },
      { status: 500 }
    )
  }
}

// Add person to user's network
export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { person_name, person_email, relationship, notes, photo_url } = body

    if (!person_name?.trim()) {
      return NextResponse.json({ error: 'Person name is required' }, { status: 400 })
    }

    // Check if person with this email is already a platform user
    let person_user_id = null
    if (person_email) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', person_email.toLowerCase())
        .single()
      
      if (existingUser) {
        person_user_id = existingUser.id
      }
    }

    const { data: newPerson, error } = await supabaseAdmin
      .from('user_networks')
      .insert({
        owner_id: user.userId,
        person_name: person_name.trim(),
        person_email: person_email?.toLowerCase(),
        relationship: relationship?.trim(),
        photo_url: photo_url?.trim()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      person: newPerson
    })
  } catch (error) {
    console.error('Failed to add person to network:', error)
    return NextResponse.json(
      { error: 'Failed to add person' },
      { status: 500 }
    )
  }
}
