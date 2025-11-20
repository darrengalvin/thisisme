import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get all memories the user has access to (owned + collaborative)
    const { data: memories, error: memoriesError } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        title,
        text_content,
        image_url,
        user_id,
        created_at,
        updated_at
      `)
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })

    if (memoriesError) {
      console.error('Error fetching owned memories:', memoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      )
    }

    // Get collaborators for owned memories (to see who you've shared with)
    // Only fetch if user has memories
    let ownedCollaborations = null
    if (memories && memories.length > 0) {
      const { data, error: ownedCollabsError } = await supabaseAdmin
        .from('memory_collaborations')
        .select(`
          memory_id,
          collaborator_id,
          permissions,
          status
        `)
        .in('memory_id', memories.map(m => m.id))

      if (ownedCollabsError) {
        console.error('Error fetching owned memory collaborations:', ownedCollabsError)
      } else {
        ownedCollaborations = data
      }
    }

    // Create a map of memory_id -> collaborators count
    const collaboratorsMap = new Map<string, number>()
    if (ownedCollaborations) {
      ownedCollaborations.forEach(collab => {
        const count = collaboratorsMap.get(collab.memory_id) || 0
        collaboratorsMap.set(collab.memory_id, count + 1)
      })
    }

    // Get collaborative memories (both pending and accepted)
    const { data: collaborations, error: collaborationsError } = await supabaseAdmin
      .from('memory_collaborations')
      .select(`
        id,
        memory_id,
        permissions,
        status,
        invited_by,
        invited_at,
        memory:memories!memory_collaborations_memory_id_fkey(
          id,
          title,
          text_content,
          image_url,
          user_id,
          created_at,
          updated_at
        ),
        inviter:users!memory_collaborations_invited_by_fkey(email)
      `)
      .eq('collaborator_id', user.userId)
      .in('status', ['pending', 'accepted'])

    if (collaborationsError) {
      console.error('Error fetching collaborative memories:', collaborationsError)
      return NextResponse.json(
        { error: 'Failed to fetch collaborative memories' },
        { status: 500 }
      )
    }

    // Format the results with proper typing
    interface MemoryWithAccess {
      id: string
      title: string
      text_content?: string
      image_url?: string
      user_id: string
      created_at: string
      updated_at: string
      type: 'owned' | 'collaborative' | 'shared'
      permissions: string[]
      isOwner: boolean
      invitedBy?: string
      invitedByEmail?: string
      collaborationId?: string
      collaboratorsCount?: number
      status?: 'pending' | 'accepted'
    }

    const ownedMemories: MemoryWithAccess[] = memories.map(memory => {
      const collaboratorsCount = collaboratorsMap.get(memory.id) || 0
      return {
        ...memory,
        type: collaboratorsCount > 0 ? ('shared' as const) : ('owned' as const),
        permissions: ['view', 'comment', 'add_text', 'add_images'], // Full access for owner
        isOwner: true,
        collaboratorsCount
      }
    })

    const collaborativeMemories: MemoryWithAccess[] = collaborations
      .filter(collab => collab.memory) // Filter out any null memories
      .map(collab => {
        const memory = collab.memory as any // Type assertion for Supabase result
        const inviter = (collab as any).inviter
        return {
          id: memory.id,
          title: memory.title,
          text_content: memory.text_content,
          image_url: memory.image_url,
          user_id: memory.user_id,
          created_at: memory.created_at,
          updated_at: memory.updated_at,
          type: 'collaborative' as const,
          permissions: collab.permissions,
          isOwner: false,
          invitedBy: collab.invited_by,
          invitedByEmail: inviter?.email,
          collaborationId: (collab as any).id, // This is the collaboration record ID, not memory_id
          status: collab.status as 'pending' | 'accepted'
        }
      })

    // Combine and sort by creation date
    const allMemories: MemoryWithAccess[] = [...ownedMemories, ...collaborativeMemories]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      data: allMemories,
      counts: {
        owned: ownedMemories.filter(m => m.type === 'owned').length,
        shared: ownedMemories.filter(m => m.type === 'shared').length,
        collaborative: collaborativeMemories.length,
        total: allMemories.length
      }
    })

  } catch (error) {
    console.error('Error fetching collaborative memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}
