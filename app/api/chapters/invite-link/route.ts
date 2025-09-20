import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// POST /api/chapters/invite-link - Generate a shareable invite link for a chapter
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
    const { chapterId, expiresIn = 7 * 24 * 60 * 60 * 1000 } = body // Default 7 days

    console.log('🔗 INVITE LINK API: Generating link for chapter:', chapterId)

    // Validate input
    if (!chapterId) {
      return NextResponse.json({ error: 'Chapter ID is required' }, { status: 400 })
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
      console.error('🔗 INVITE LINK API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Check if user is a member of this chapter
    const isMember = chapter.timezone_members.some((member: any) => member.user_id === user.userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate a secure invite token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + expiresIn)

    // Store the invite token (you might want to create an invite_tokens table)
    // For now, we'll create a simple invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/join/${chapterId}?token=${inviteToken}&expires=${expiresAt.getTime()}`

    console.log('🔗 INVITE LINK API: Generated invite link:', inviteLink)

    // TODO: Store the invite token in database for validation
    // For now, we'll just return the link

    return NextResponse.json({
      success: true,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      chapter: {
        id: chapter.id,
        title: chapter.title
      }
    })

  } catch (error) {
    console.error('Failed to generate invite link:', error)
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    )
  }
}
