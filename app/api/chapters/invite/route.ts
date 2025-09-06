import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// POST /api/chapters/invite - Send email invitations to collaborate on a chapter
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
    const { chapterId, emails, message } = body

    console.log('📧 CHAPTER INVITE API: Sending invites for chapter:', chapterId, 'to:', emails)

    // Validate input
    if (!chapterId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Chapter ID and emails are required' }, { status: 400 })
    }

    // Verify user has access to this chapter
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from('timezones')
      .select(`
        id,
        title,
        timezone_members!inner(
          user_id
        )
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      console.error('📧 CHAPTER INVITE API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Check if user is a member of this chapter
    const isMember = chapter.timezone_members.some((member: any) => member.user_id === user.userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create notifications for each email (if they're existing users)
    const inviteResults = []
    
    for (const email of emails) {
      if (!email.trim() || !email.includes('@')) {
        continue // Skip invalid emails
      }

      console.log('📧 CHAPTER INVITE API: Processing invite for:', email)

      // Check if this email belongs to an existing user
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (existingUser) {
        // Create notification for existing user
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: existingUser.id,
            type: 'TIMEZONE_INVITATION',
            title: 'Chapter Collaboration Invitation',
            message: `You've been invited to collaborate on "${chapter.title}" by ${user.email}`,
            data: {
              chapter_id: chapterId,
              chapter_title: chapter.title,
              invited_by: user.email,
              invite_message: message
            }
          })

        if (notificationError) {
          console.error('📧 CHAPTER INVITE API: Failed to create notification:', notificationError)
        } else {
          console.log('📧 CHAPTER INVITE API: Notification created for existing user:', email)
        }

        inviteResults.push({
          email,
          status: 'notification_sent',
          user_exists: true
        })
      } else {
        // For non-existing users, we would typically send an email
        // For now, we'll just log it (you can integrate with SendGrid later)
        console.log('📧 CHAPTER INVITE API: Would send email invite to:', email)
        
        inviteResults.push({
          email,
          status: 'email_would_be_sent',
          user_exists: false
        })
      }
    }

    console.log('📧 CHAPTER INVITE API: Invite results:', inviteResults)

    return NextResponse.json({
      success: true,
      message: 'Invitations processed successfully',
      results: inviteResults,
      chapter: {
        id: chapter.id,
        title: chapter.title
      }
    })

  } catch (error) {
    console.error('Failed to send chapter invitations:', error)
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    )
  }
}
