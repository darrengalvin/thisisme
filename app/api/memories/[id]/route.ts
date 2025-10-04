import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id
    console.log('🔍 MEMORY API: Request for memory:', memoryId)
    
    // Try to get token from request
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    console.log('🔍 MEMORY API: Token present:', !!token)
    
    if (token) {
      // User is authenticated - check if they have access
      const user = await verifyToken(token)
      console.log('🔍 MEMORY API: User verified:', user ? user.userId : 'null')
      if (user) {
        // First, check if user owns this memory
        const { data: ownedMemory, error: ownedMemoryError } = await supabaseAdmin
          .from('memories')
          .select(`
            id,
            title,
            text_content,
            image_url,
            user_id,
            created_at,
            media(*)
          `)
          .eq('id', memoryId)
          .eq('user_id', user.userId)
          .single()

        if (!ownedMemoryError && ownedMemory) {
          // Fetch memory tags separately to avoid relationship issues
          const { data: memoryTags } = await supabaseAdmin
            .from('memory_tags')
            .select(`
              id,
              tagged_person_id,
              user_networks(
                id,
                person_name,
                person_email,
                relationship
              )
            `)
            .eq('memory_id', memoryId)

          // Add tags to memory object
          const memoryWithTags = {
            ...ownedMemory,
            memory_tags: memoryTags || []
          }

          // User owns this memory
          return NextResponse.json({ 
            memory: memoryWithTags,
            permissions: ['view', 'comment', 'add_text', 'add_images'], // Full access for owner
            isOwner: true
          })
        }

        // Check for collaboration permissions (including pending invitations)
        console.log('🔍 MEMORY API: Checking collaboration for user:', user.userId, 'memory:', memoryId)
        const { data: collaboration, error: collaborationError } = await supabaseAdmin
          .from('memory_collaborations')
          .select('permissions, status')
          .eq('memory_id', memoryId)
          .eq('collaborator_id', user.userId)
          .single()

        console.log('🔍 MEMORY API: Collaboration query result:', { 
          hasData: !!collaboration, 
          error: collaborationError?.message,
          status: collaboration?.status,
          permissions: collaboration?.permissions
        })

        if (!collaborationError && collaboration) {
        // User has collaboration access (accepted or pending)
        const { data: collaborativeMemory, error: collaborativeMemoryError } = await supabaseAdmin
          .from('memories')
          .select(`
            id,
            title,
            text_content,
            image_url,
            user_id,
            created_at,
            media(*)
          `)
          .eq('id', memoryId)
          .single()

          if (!collaborativeMemoryError && collaborativeMemory) {
            // Fetch memory tags separately to avoid relationship issues
            const { data: memoryTags } = await supabaseAdmin
              .from('memory_tags')
              .select(`
                id,
                tagged_person_id,
                user_networks(
                  id,
                  person_name,
                  person_email,
                  relationship
                )
              `)
              .eq('memory_id', memoryId)

            // Add tags to memory object
            const memoryWithTags = {
              ...collaborativeMemory,
              memory_tags: memoryTags || []
            }

            const permissions = collaboration.status === 'accepted' ? ['view', 'comment', 'add_text', 'add_images'] : ['view']
            console.log('🔍 MEMORY API: Collaborative memory access, permissions:', permissions)
            return NextResponse.json({ 
              memory: memoryWithTags,
              permissions: permissions,
              isOwner: false,
              isCollaboration: true,
              collaborationStatus: collaboration.status
            })
          }
        }

        // If no ownership or collaboration, check if this is a public invitation
        // For now, let's allow access to any authenticated user for testing
        console.log('🔍 MEMORY API: No ownership or collaboration found, checking for public memory access')
        const { data: publicMemory, error: publicMemoryError } = await supabaseAdmin
          .from('memories')
          .select(`
            id,
            title,
            text_content,
            image_url,
            user_id,
            created_at,
            media(*)
          `)
          .eq('id', memoryId)
          .single()

        console.log('🔍 MEMORY API: Public memory query result:', { 
          hasData: !!publicMemory, 
          error: publicMemoryError?.message,
          memoryId: publicMemory?.id 
        })

        if (!publicMemoryError && publicMemory) {
          // Fetch memory tags separately to avoid relationship issues
          const { data: memoryTags } = await supabaseAdmin
            .from('memory_tags')
            .select(`
              id,
              tagged_person_id,
              user_networks(
                id,
                person_name,
                person_email,
                relationship
              )
            `)
            .eq('memory_id', memoryId)

          // Add tags to memory object
          const memoryWithTags = {
            ...publicMemory,
            memory_tags: memoryTags || []
          }

          // Allow view access for authenticated users (for testing)
          console.log('🔍 MEMORY API: Returning public memory access')
          console.log('🔍 MEMORY API: Permissions being sent:', ['view', 'comment', 'add_text', 'add_images'])
          return NextResponse.json({ 
            memory: memoryWithTags,
            permissions: ['view', 'comment', 'add_text', 'add_images'],
            isOwner: false,
            isCollaboration: false,
            isPublicView: true
          })
        }

        // Memory not found
        console.log('🔍 MEMORY API: Memory not found, error:', publicMemoryError?.message)
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        )
      }
    }

    // No authentication or invalid token
    // Check if this is an invitation link
    const url = new URL(request.url)
    const isInvited = url.searchParams.get('invited') === 'true'
    
    if (isInvited) {
      // This is an invitation - return limited memory info for preview
      const { data: memory, error: memoryError } = await supabaseAdmin
        .from('memories')
        .select(`
          id,
          title,
          text_content,
          image_url,
          created_at,
          media(*)
        `)
        .eq('id', memoryId)
        .single()

      if (memoryError || !memory) {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        )
      }

      // Fetch memory tags separately to avoid relationship issues
      const { data: memoryTags } = await supabaseAdmin
        .from('memory_tags')
        .select(`
          id,
          tagged_person_id,
          user_networks(
            id,
            person_name,
            person_email,
            relationship
          )
        `)
        .eq('memory_id', memoryId)

      // Return invitation preview (no sensitive data)
      return NextResponse.json({
        memory: {
          ...memory,
          memory_tags: memoryTags || [],
          // Don't include user_id for invitations
        },
        permissions: ['view', 'comment', 'add_text', 'add_images'], // Default permissions for invitations
        isInvitation: true
      })
    }

    // Not authenticated and not an invitation
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Error fetching memory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory' },
      { status: 500 }
    )
  }
}