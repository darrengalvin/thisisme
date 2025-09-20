import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'
import { sendChapterInviteEmail } from '@/lib/resend'

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
    const { chapterId, invites, message, addToNetwork } = body

    console.log('📧 CHAPTER INVITE API: Sending invites for chapter:', chapterId, 'to:', invites)

    // Validate input
    if (!chapterId || !invites || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: 'Chapter ID and invites are required' }, { status: 400 })
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

    // Create notifications for each invite (if they're existing users)
    const inviteResults = []
    
    for (const invite of invites) {
      const { email, name, relationship } = invite
      
      if (!email?.trim() || !email.includes('@') || !name?.trim()) {
        continue // Skip invalid invites
      }

      console.log('📧 CHAPTER INVITE API: Processing invite for:', { email, name, relationship })

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

        // If addToNetwork is true, also add this person to the user's network
        if (addToNetwork) {
          try {
            console.log('👥 CHAPTER INVITE API: Adding existing user to network:', { email, name, relationship })
            
            const { error: networkError } = await supabaseAdmin
              .from('user_networks')
              .insert({
                user_id: user.userId,
                person_name: name.trim(),
                person_email: email.toLowerCase().trim(),
                relationship: relationship || 'Chapter Collaborator',
                notes: `Added via chapter invitation for "${chapter.title}"`
              })
            
            if (networkError) {
              console.error('👥 CHAPTER INVITE API: Failed to add existing user to network:', networkError)
            } else {
              console.log('👥 CHAPTER INVITE API: Added existing user to network successfully:', email)
            }
          } catch (networkError) {
            console.error('👥 CHAPTER INVITE API: Error adding existing user to network:', networkError)
          }
        }

        inviteResults.push({
          email,
          status: 'notification_sent',
          user_exists: true,
          added_to_network: addToNetwork || false
        })
      } else {
        // Send email invite to non-existing users
        try {
          console.log('📧 CHAPTER INVITE API: Sending email invite to:', email)
          
          await sendChapterInviteEmail(
            email,
            chapter.title,
            user.email,
            message
          )
          
          console.log('📧 CHAPTER INVITE API: Email sent successfully to:', email)
          
          // If addToNetwork is true, add this person to the user's network
          if (addToNetwork) {
            try {
              console.log('👥 CHAPTER INVITE API: Adding to network:', email)
              
              const { error: networkError } = await supabaseAdmin
                .from('user_networks')
                .insert({
                  user_id: user.userId,
                  person_name: email.split('@')[0], // Use email prefix as name
                  person_email: email.toLowerCase().trim(),
                  relationship: 'Chapter Collaborator',
                  notes: `Added via chapter invitation for "${chapter.title}"`
                })
              
              if (networkError) {
                console.error('👥 CHAPTER INVITE API: Failed to add to network:', networkError)
              } else {
                console.log('👥 CHAPTER INVITE API: Added to network successfully:', email)
              }
            } catch (networkError) {
              console.error('👥 CHAPTER INVITE API: Error adding to network:', networkError)
            }
          }
          
          inviteResults.push({
            email,
            status: 'email_sent',
            user_exists: false,
            added_to_network: addToNetwork || false
          })
        } catch (emailError) {
          console.error('📧 CHAPTER INVITE API: Failed to send email to:', email, emailError)
          
          inviteResults.push({
            email,
            status: 'email_failed',
            user_exists: false,
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
        }
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
