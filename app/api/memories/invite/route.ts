import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendMemoryInviteEmail } from '@/lib/resend'

export async function GET() {
  console.log('📧 MEMORY INVITE API: GET request received')
  return NextResponse.json({ success: true, message: 'Memory invite API is working' })
}

export async function POST(request: NextRequest) {
  console.log('📧 MEMORY INVITE API: Received request')
  console.log('📧 MEMORY INVITE API: Request URL:', request.url)
  console.log('📧 MEMORY INVITE API: Request method:', request.method)
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    console.log('📧 MEMORY INVITE API: Token extracted:', token ? 'present' : 'missing')
    if (!token) {
      console.log('📧 MEMORY INVITE API: No token provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      memoryId, 
      email, 
      message, 
      reason, 
      permissions = [] 
    } = body

    console.log('📧 MEMORY INVITE API: Sending invite for memory:', memoryId, 'to:', email)
    console.log('📧 MEMORY INVITE API: User ID:', user.userId)

    // Validate input
    if (!memoryId || !email) {
      return NextResponse.json(
        { success: false, error: 'Memory ID and email are required' },
        { status: 400 }
      )
    }

    // First, let's check if the memory exists at all
    const { data: allMemories, error: allMemoriesError } = await supabaseAdmin
      .from('memories')
      .select('id, title, user_id')
      .eq('user_id', user.userId)
      .limit(10)

    console.log('📧 MEMORY INVITE API: User memories:', allMemories)
    console.log('📧 MEMORY INVITE API: Looking for memory ID:', memoryId)

    // Verify user has access to this memory
    console.log('📧 MEMORY INVITE API: About to query memory with ID:', memoryId, 'and user_id:', user.userId)
    
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        title,
        text_content,
        image_url,
        user_id
      `)
      .eq('id', memoryId)
      .eq('user_id', user.userId)
      .single()

    console.log('📧 MEMORY INVITE API: Memory query result:', { memory, memoryError })

    if (memoryError || !memory) {
      console.error('📧 MEMORY INVITE API: Memory not found:', memoryError)
      console.error('📧 MEMORY INVITE API: Available memories for user:', allMemories)
      console.error('📧 MEMORY INVITE API: Query details - memoryId:', memoryId, 'userId:', user.userId)
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns this memory
    if (memory.user_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user exists by email
    const { data: collaboratorUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    // Handle error checking - but user not existing is OK (we'll create a pending invite)
    if (userError && userError.code !== 'PGRST116') {
      console.error('📧 MEMORY INVITE API: Error checking user:', userError)
      return NextResponse.json(
        { success: false, error: 'Failed to check user existence' },
        { status: 500 }
      )
    }

    // Check if there's already an invite for this memory + email/user combo
    let existingInviteQuery = supabaseAdmin
      .from('memory_collaborations')
      .select('id, status')
      .eq('memory_id', memory.id)

    if (collaboratorUser) {
      existingInviteQuery = existingInviteQuery.eq('collaborator_id', collaboratorUser.id)
    } else {
      existingInviteQuery = existingInviteQuery.eq('invited_email', email)
    }

    const { data: existingInvite } = await existingInviteQuery.maybeSingle()

    if (existingInvite) {
      console.log('📧 MEMORY INVITE API: Invitation already exists:', existingInvite)
      return NextResponse.json(
        { 
          success: false, 
          error: existingInvite.status === 'accepted' 
            ? 'This user is already collaborating on this memory'
            : 'An invitation has already been sent to this user'
        },
        { status: 409 }
      )
    }

    // Create collaboration record - either with user ID or email
    const collaborationData: any = {
      memory_id: memory.id,
      invited_by: user.userId,
      permissions: permissions,
      status: 'pending'
    }

    if (collaboratorUser) {
      // User exists - link directly
      collaborationData.collaborator_id = collaboratorUser.id
      console.log('📧 MEMORY INVITE API: Creating invite for existing user:', collaboratorUser.email)
    } else {
      // User doesn't exist - store email for pending invite
      collaborationData.invited_email = email
      console.log('📧 MEMORY INVITE API: Creating pending invite for:', email)
    }

    const { data: collaboration, error: collaborationError } = await supabaseAdmin
      .from('memory_collaborations')
      .insert(collaborationData)
      .select()
      .single()

    if (collaborationError) {
      console.error('📧 MEMORY INVITE API: Error creating collaboration:', collaborationError)
      return NextResponse.json(
        { success: false, error: 'Failed to create collaboration record' },
        { status: 500 }
      )
    }

    // Send email invitation
    try {
      await sendMemoryInviteEmail({
        to: email,
        memoryTitle: memory.title,
        memoryDescription: memory.text_content,
        memoryImageUrl: memory.image_url,
        inviterName: user.email || 'Someone',
        inviterEmail: user.email,
        message: message || '',
        reason: reason || '',
        permissions: permissions,
        memoryId: memory.id
      })

      console.log('📧 MEMORY INVITE API: Email sent successfully to:', email)
      console.log('📧 MEMORY INVITE API: Collaboration created with ID:', collaboration.id)
      
      const isPending = !collaboratorUser
      
      return NextResponse.json({
        success: true,
        message: isPending 
          ? 'Invitation sent! They will be able to collaborate once they create an account.'
          : 'Memory invitation sent successfully',
        collaborationId: collaboration.id,
        isPending
      })
    } catch (emailError) {
      console.error('📧 MEMORY INVITE API: Email sending failed:', emailError)
      
      // Clean up the collaboration record if email failed
      await supabaseAdmin
        .from('memory_collaborations')
        .delete()
        .eq('id', collaboration.id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('📧 MEMORY INVITE API: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
