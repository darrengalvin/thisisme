import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// POST /api/chapters/join - Join a chapter via invitation link
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
    const { chapterId, inviteToken, invitedBy } = body

    console.log('🚪 JOIN CHAPTER API: User joining chapter:', { 
      userId: user.userId, 
      chapterId, 
      invitedBy 
    })

    // Validate input
    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID is required' }, { status: 400 })
    }

    // Get chapter details
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from('timezones')
      .select(`
        id,
        title,
        description,
        user_id,
        created_at
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      console.error('🚪 JOIN CHAPTER API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('timezone_members')
      .select('id')
      .eq('timezone_id', chapterId)
      .eq('user_id', user.userId)
      .single()

    if (existingMember) {
      console.log('🚪 JOIN CHAPTER API: User already a member')
      return NextResponse.json({ 
        success: true, 
        message: 'Already a member of this chapter',
        chapter: {
          id: chapter.id,
          title: chapter.title
        }
      })
    }

    // Add user as a member of the chapter
    const { data: newMember, error: memberError } = await supabaseAdmin
      .from('timezone_members')
      .insert({
        timezone_id: chapterId,
        user_id: user.userId,
        role: 'MEMBER',
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memberError) {
      console.error('🚪 JOIN CHAPTER API: Failed to add member:', memberError)
      return NextResponse.json({ error: 'Failed to join chapter' }, { status: 500 })
    }

    // If this was an invitation (not just a share link), add the inviter to the user's network
    if (invitedBy && chapter.user_id !== user.userId) {
      try {
        console.log('👥 JOIN CHAPTER API: Adding inviter to user network')
        
        // Get inviter details
        const { data: inviter } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', chapter.user_id)
          .single()

        if (inviter) {
          // Add inviter to user's network
          const { error: networkError } = await supabaseAdmin
            .from('user_networks')
            .insert({
              user_id: user.userId,
              person_name: inviter.email.split('@')[0], // Use email prefix as name
              person_email: inviter.email,
              relationship: 'Chapter Collaborator',
              notes: `Added via chapter invitation for "${chapter.title}"`
            })

          if (networkError) {
            console.error('👥 JOIN CHAPTER API: Failed to add inviter to network:', networkError)
          } else {
            console.log('👥 JOIN CHAPTER API: Added inviter to user network')
          }
        }
      } catch (networkError) {
        console.error('👥 JOIN CHAPTER API: Error adding inviter to network:', networkError)
      }
    }

    console.log('🚪 JOIN CHAPTER API: Successfully joined chapter')

    return NextResponse.json({
      success: true,
      message: 'Successfully joined chapter',
      member: newMember,
      chapter: {
        id: chapter.id,
        title: chapter.title
      }
    })

  } catch (error) {
    console.error('Failed to join chapter:', error)
    return NextResponse.json(
      { error: 'Failed to join chapter' },
      { status: 500 }
    )
  }
}


