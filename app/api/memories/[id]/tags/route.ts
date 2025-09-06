import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Get tags for a memory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id: memoryId } = params

    // Verify user can access this memory
    const { data: memory } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        user_id,
        timezone_id,
        timezones!inner(id)
      `)
      .eq('id', memoryId)
      .single()

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Check if user can access this memory (owner or timezone member)
    const canAccess = memory.user_id === user.userId || (
      memory.timezone_id && await checkTimezoneMembership(memory.timezone_id, user.userId)
    )

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get tags with person details
    const { data: tags, error } = await supabaseAdmin
      .from('memory_tags')
      .select(`
        id,
        memory_id,
        tagged_person_id,
        tagged_by_user_id,
        created_at,
        user_networks!inner(
          id,
          person_name,
          person_email,
          relationship
        ),
        users!memory_tags_tagged_by_user_id_fkey(
          id,
          email
        )
      `)
      .eq('memory_id', memoryId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      tags: tags || []
    })
  } catch (error) {
    console.error('Failed to fetch memory tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

// Add tags to a memory
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id: memoryId } = params
    const body = await request.json()
    const { tagged_person_ids } = body

    if (!Array.isArray(tagged_person_ids) || tagged_person_ids.length === 0) {
      return NextResponse.json({ error: 'tagged_person_ids array is required' }, { status: 400 })
    }

    // Verify user can access this memory
    const { data: memory } = await supabaseAdmin
      .from('memories')
      .select('id, user_id, timezone_id')
      .eq('id', memoryId)
      .single()

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Check if user can tag in this memory (owner or timezone member)
    const canTag = memory.user_id === user.userId || (
      memory.timezone_id && await checkTimezoneMembership(memory.timezone_id, user.userId)
    )

    if (!canTag) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify all tagged persons belong to the user's network
    const { data: networkPeople } = await supabaseAdmin
      .from('user_networks')
      .select('id')
      .eq('owner_id', user.userId)
      .in('id', tagged_person_ids)

    if (!networkPeople || networkPeople.length !== tagged_person_ids.length) {
      return NextResponse.json({ error: 'Some tagged persons not found in your network' }, { status: 400 })
    }

    // Create tags (ignore duplicates)
    const tagsToInsert = tagged_person_ids.map(personId => ({
      memory_id: memoryId,
      tagged_person_id: personId,
      tagged_by_user_id: user.userId
    }))

    const { data: newTags, error } = await supabaseAdmin
      .from('memory_tags')
      .upsert(tagsToInsert, { 
        onConflict: 'memory_id,tagged_person_id',
        ignoreDuplicates: true 
      })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      tags: newTags || []
    })
  } catch (error) {
    console.error('Failed to add memory tags:', error)
    return NextResponse.json(
      { error: 'Failed to add tags' },
      { status: 500 }
    )
  }
}

// Helper function to check timezone membership
async function checkTimezoneMembership(timezoneId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('timezone_members')
    .select('id')
    .eq('timezone_id', timezoneId)
    .eq('user_id', userId)
    .single()
  
  return !!data
}
