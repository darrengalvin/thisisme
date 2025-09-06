import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Get memories tagged with a specific person
export async function GET(
  request: NextRequest,
  { params }: { params: { personId: string } }
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

    const { personId } = params

    // First verify this person belongs to the user
    const { data: person, error: personError } = await supabaseAdmin
      .from('user_networks')
      .select('*')
      .eq('id', personId)
      .eq('user_id', user.userId)
      .single()

    if (personError || !person) {
      return NextResponse.json({ error: 'Person not found or access denied' }, { status: 404 })
    }

    // Get memories tagged with this person
    const { data: taggedMemories, error: memoriesError } = await supabaseAdmin
      .from('memory_tags')
      .select(`
        memory_id,
        created_at,
        memories (
          id,
          title,
          description,
          memory_date,
          timezone_id,
          timezones (
            title
          )
        )
      `)
      .eq('tagged_person_id', personId)
      .order('created_at', { ascending: false })

    if (memoriesError) {
      console.error('Error fetching tagged memories:', memoriesError)
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
    }

    // Transform the data to be more usable
    const memories = taggedMemories?.map(tag => ({
      id: tag.memories.id,
      title: tag.memories.title,
      description: tag.memories.description,
      memory_date: tag.memories.memory_date,
      tagged_at: tag.created_at,
      chapter: tag.memories.timezones?.title || 'Unknown Chapter'
    })) || []

    return NextResponse.json({
      success: true,
      person,
      memories,
      total_memories: memories.length
    })
  } catch (error) {
    console.error('Failed to fetch person memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch person memories' },
      { status: 500 }
    )
  }
}
