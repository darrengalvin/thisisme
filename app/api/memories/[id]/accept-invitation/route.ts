import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id
    
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

    // Check if there's a pending collaboration for this user and memory
    const { data: collaboration, error: collaborationError } = await supabaseAdmin
      .from('memory_collaborations')
      .select('*')
      .eq('memory_id', memoryId)
      .eq('collaborator_id', user.userId)
      .eq('status', 'pending')
      .single()

    if (collaborationError || !collaboration) {
      return NextResponse.json(
        { error: 'No pending invitation found' },
        { status: 404 }
      )
    }

    // Accept the collaboration
    const { error: updateError } = await supabaseAdmin
      .from('memory_collaborations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', collaboration.id)

    if (updateError) {
      console.error('Error accepting collaboration:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    // Get the memory details for the response
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select('id, title, text_content, image_url, user_id')
      .eq('id', memoryId)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      memory: {
        ...memory,
        permissions: collaboration.permissions,
        isCollaboration: true
      }
    })

  } catch (error) {
    console.error('Error accepting memory invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
