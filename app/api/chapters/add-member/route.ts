import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// POST /api/chapters/add-member - Add a person from your network to a chapter
export async function POST(request: NextRequest) {
  try {
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
    const { chapterId, personId, personName, personEmail } = body

    console.log('👥 ADD MEMBER API: Adding person to chapter:', { chapterId, personId, personName })

    // Validate input
    if (!chapterId || !personId || !personName) {
      return NextResponse.json({ error: 'Chapter ID, person ID, and person name are required' }, { status: 400 })
    }

    // Verify user has access to this chapter
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from('timezones')
      .select('id, title, creator_id')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      console.error('👥 ADD MEMBER API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Check if user is the creator or a member of this chapter
    const { data: membership } = await supabaseAdmin
      .from('timezone_members')
      .select('id')
      .eq('timezone_id', chapterId)
      .eq('user_id', user.userId)
      .single()

    const isCreator = chapter.creator_id === user.userId
    const isMember = !!membership

    if (!isCreator && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the person from user_networks
    console.log('👥 ADD MEMBER API: Querying user_networks for person:', { personId, userId: user.userId })
    
    const { data: networkPerson, error: networkError } = await supabaseAdmin
      .from('user_networks')
      .select('id, pending_chapter_invitations')
      .eq('id', personId)
      .eq('owner_id', user.userId) // Fixed: use owner_id instead of user_id
      .single()

    console.log('👥 ADD MEMBER API: Network query result:', { 
      found: !!networkPerson, 
      error: networkError?.message,
      errorCode: networkError?.code 
    })

    if (networkError || !networkPerson) {
      console.error('👥 ADD MEMBER API: Person not found in network:', networkError)
      return NextResponse.json({ 
        error: 'Person not found in your network',
        details: networkError?.message 
      }, { status: 404 })
    }

    // Check if person already has a pending invitation for this chapter
    const pendingInvitations = networkPerson.pending_chapter_invitations || []
    if (pendingInvitations.includes(chapterId)) {
      console.log('👥 ADD MEMBER API: Person already has pending invitation:', personName)
      return NextResponse.json({ 
        success: true, 
        message: `${personName} already has access to this chapter`,
        alreadyInvited: true
      })
    }

    // Add chapter to person's pending invitations
    const updatedInvitations = [...pendingInvitations, chapterId]
    const { error: updateError } = await supabaseAdmin
      .from('user_networks')
      .update({
        pending_chapter_invitations: updatedInvitations
      })
      .eq('id', personId)

    if (updateError) {
      console.error('👥 ADD MEMBER API: Failed to add invitation:', updateError)
      return NextResponse.json({ error: 'Failed to invite person to chapter' }, { status: 500 })
    }

    console.log('👥 ADD MEMBER API: Successfully invited person:', personName)

    return NextResponse.json({
      success: true,
      message: `${personName} has been given access to the chapter`,
      personId: personId
    })

  } catch (error) {
    console.error('👥 ADD MEMBER API: Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


