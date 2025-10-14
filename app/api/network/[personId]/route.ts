import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Update person in user's network
export async function PUT(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    console.log('🔍 NETWORK UPDATE API: Starting PUT request for person:', params.personId)
    
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ NETWORK UPDATE API: No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 NETWORK UPDATE API: Verifying token...')
    
    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ NETWORK UPDATE API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ NETWORK UPDATE API: Token verified for user:', user.userId)

    const personId = params.personId
    const body = await request.json()
    const { person_name, person_email, person_phone, relationship, notes, photo_url } = body

    if (!person_name?.trim()) {
      return NextResponse.json({ error: 'Person name is required' }, { status: 400 })
    }

    // First, verify that this person belongs to the user
    const { data: existingPerson, error: fetchError } = await supabaseAdmin
      .from('user_networks')
      .select('id, owner_id')
      .eq('id', personId)
      .single()

    if (fetchError || !existingPerson) {
      console.log('❌ NETWORK UPDATE API: Person not found:', personId)
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    if (existingPerson.owner_id !== user.userId) {
      console.log('❌ NETWORK UPDATE API: Permission denied for person:', personId)
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
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

    console.log('🔍 NETWORK UPDATE API: Updating person with data:', {
      person_name: person_name.trim(),
      person_email: person_email?.toLowerCase(),
      relationship: relationship?.trim(),
      notes: notes?.trim(),
      photo_url: photo_url?.trim()
    })

    const { data: updatedPerson, error } = await supabaseAdmin
      .from('user_networks')
      .update({
        person_name: person_name.trim(),
        person_email: person_email?.toLowerCase(),
        person_phone: person_phone?.trim(),
        relationship: relationship?.trim(),
        notes: notes?.trim(),
        photo_url: photo_url?.trim(),
        person_user_id: person_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', personId)
      .select()
      .single()

    if (error) {
      console.error('❌ NETWORK UPDATE API: Database error:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('✅ NETWORK UPDATE API: Person updated successfully:', updatedPerson.id)

    return NextResponse.json({
      success: true,
      person: updatedPerson
    })
  } catch (error) {
    console.error('❌ NETWORK UPDATE API: Failed to update person:', {
      error,
      errorType: typeof error,
      errorString: String(error),
      errorJSON: JSON.stringify(error, null, 2)
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to update person',
        details: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}

// Delete person from user's network
export async function DELETE(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    console.log('🔍 NETWORK DELETE API: Starting DELETE request for person:', params.personId)
    
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ NETWORK DELETE API: No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 NETWORK DELETE API: Verifying token...')
    
    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ NETWORK DELETE API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ NETWORK DELETE API: Token verified for user:', user.userId)

    const personId = params.personId
    console.log('🔍 NETWORK DELETE API: Attempting to delete person ID:', personId)
    console.log('🔍 NETWORK DELETE API: User ID from token:', user.userId)

    // First, verify that this person belongs to the user
    const { data: existingPerson, error: fetchError } = await supabaseAdmin
      .from('user_networks')
      .select('id, owner_id, person_name')
      .eq('id', personId)
      .single()

    console.log('🔍 NETWORK DELETE API: Query result:', {
      found: !!existingPerson,
      error: fetchError?.message,
      personData: existingPerson
    })

    if (fetchError || !existingPerson) {
      console.log('❌ NETWORK DELETE API: Person not found:', personId, 'Error:', fetchError)
      // Let's also check if the person exists at all (without owner filter)
      const { data: anyPerson } = await supabaseAdmin
        .from('user_networks')
        .select('id, owner_id, person_name')
        .eq('id', personId)
        .maybeSingle()
      console.log('🔍 NETWORK DELETE API: Person exists in DB (any owner)?', anyPerson)
      
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    if (existingPerson.owner_id !== user.userId) {
      console.log('❌ NETWORK DELETE API: Permission denied for person:', personId)
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete all memory tags associated with this person first
    const { error: tagsError } = await supabaseAdmin
      .from('memory_tags')
      .delete()
      .eq('tagged_person_id', personId)

    if (tagsError) {
      console.error('❌ NETWORK DELETE API: Error deleting memory tags:', tagsError)
      // Continue with person deletion even if tag deletion fails
    }

    // Delete the person
    const { error } = await supabaseAdmin
      .from('user_networks')
      .delete()
      .eq('id', personId)

    if (error) {
      console.error('❌ NETWORK DELETE API: Database error:', error)
      throw error
    }

    console.log('✅ NETWORK DELETE API: Person deleted successfully:', personId)

    return NextResponse.json({
      success: true,
      message: 'Person deleted successfully'
    })
  } catch (error) {
    console.error('❌ NETWORK DELETE API: Failed to delete person:', error)
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 }
    )
  }
}
