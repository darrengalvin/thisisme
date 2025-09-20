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
      console.error('👥 ADD MEMBER API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Check if user is a member of this chapter
    const isMember = chapter.timezone_members.some((member: any) => member.user_id === user.userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if person is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('timezone_members')
      .select('id')
      .eq('timezone_id', chapterId)
      .eq('person_id', personId)
      .single()

    if (existingMember) {
      console.log('👥 ADD MEMBER API: Person already a member:', personName)
      return NextResponse.json({ 
        success: true, 
        message: `${personName} is already a member of this chapter`,
        alreadyMember: true
      })
    }

    // Add person to chapter
    const { data: newMember, error: addError } = await supabaseAdmin
      .from('timezone_members')
      .insert({
        timezone_id: chapterId,
        person_id: personId,
        person_name: personName,
        person_email: personEmail,
        added_by: user.userId,
        added_at: new Date().toISOString()
      })
      .select()
      .single()

    if (addError) {
      console.error('👥 ADD MEMBER API: Failed to add member:', addError)
      return NextResponse.json({ error: 'Failed to add person to chapter' }, { status: 500 })
    }

    console.log('👥 ADD MEMBER API: Successfully added member:', personName)

    return NextResponse.json({
      success: true,
      message: `${personName} has been added to the chapter`,
      member: newMember
    })

  } catch (error) {
    console.error('👥 ADD MEMBER API: Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
