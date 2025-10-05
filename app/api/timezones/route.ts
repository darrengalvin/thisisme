import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { generateInviteCode } from '@/lib/utils'
import { TIMEZONE_TYPES, MEMBER_ROLES } from '@/lib/types'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    if (!token) {
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

    // Check for admin impersonation
    const cookieStore = cookies()
    const impersonatingUserId = cookieStore.get('impersonating-user-id')?.value
    const adminUserId = cookieStore.get('admin-user-id')?.value
    
    // If impersonating, use the target user's ID instead
    let targetUserId = user.userId
    if (impersonatingUserId && adminUserId && user.userId === adminUserId) {
      console.log('🎭 TIMEZONES: Admin viewing as user:', { admin: user.userId, target: impersonatingUserId })
      targetUserId = impersonatingUserId
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all chapters for the user
    const { data: chapters, error: dbError } = await supabase
      .from('chapters')
      .select(`
        *,
        creator:users!chapters_creator_id_fkey(id, email),
        members:chapter_members(
          id,
          role,
          user:users(id, email)
        )
      `)
      .eq('creator_id', targetUserId)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedChapters = chapters?.map((chapter: any) => {
      // Handle old local filesystem URLs (set to null since files don't exist in Supabase)
      let headerImageUrl = chapter.header_image_url
      if (headerImageUrl && headerImageUrl.startsWith('/uploads/')) {
        // Old local filesystem URLs - set to null since files don't exist in Supabase Storage
        console.log('🔄 TRANSFORM CHAPTER: Removing old local URL for:', chapter.title, 'URL:', chapter.header_image_url)
        headerImageUrl = null
      } else {
        console.log('🖼️ TRANSFORM CHAPTER:', chapter.title, 'header_image_url:', chapter.header_image_url)
      }
      
      return {
        ...chapter,
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        type: chapter.type,
        startDate: chapter.start_date,
        endDate: chapter.end_date,
        location: chapter.location,
        headerImageUrl: headerImageUrl, // Use transformed URL
        inviteCode: chapter.invite_code,
        createdById: chapter.creator_id,
        createdAt: chapter.created_at,
        updatedAt: chapter.updated_at,
        creator: chapter.creator,
        members: chapter.members || [],
        _count: {
          members: chapter.members?.length || 0,
          memories: 0 // TODO: Add memories count
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      timeZones: transformedChapters // Keep timeZones key for backward compatibility
    })

  } catch (error) {
    console.error('Get time zones error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    if (!token) {
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

    // Support both JSON and FormData
    const contentType = request.headers.get('content-type') || ''
    let title, description, type, startDate, endDate, location, headerImageFile, headerImageUrl

    if (contentType.includes('application/json')) {
      // Handle JSON data (new flow with separate image upload)
      const jsonData = await request.json()
      title = jsonData.title
      description = jsonData.description
      type = jsonData.type
      startDate = jsonData.startDate
      endDate = jsonData.endDate
      location = jsonData.location
      headerImageUrl = jsonData.headerImageUrl
      
      console.log('📁 CHAPTER CREATION: JSON data received:', {
        title, description, type, startDate, endDate, location,
        headerImageUrl
      })
    } else {
      // Handle FormData (backward compatibility)
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      type = formData.get('type') as string
      startDate = formData.get('startDate') as string
      endDate = formData.get('endDate') as string
      location = formData.get('location') as string
      headerImageFile = formData.get('headerImage') as File

      console.log('📁 CHAPTER CREATION: Form data received:', {
        title, description, type, startDate, endDate, location,
        hasHeaderImage: !!headerImageFile,
        headerImageName: headerImageFile?.name,
        headerImageSize: headerImageFile?.size
      })
    }

    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ CHAPTER CREATION: Missing Supabase environment variables')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First, verify user exists in the users table
    console.log('🔍 CHAPTER CREATION: Verifying user exists:', user.userId)
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.userId)
      .single()

    if (userCheckError || !userExists) {
      console.error('❌ CHAPTER CREATION: User not found in database:', {
        userId: user.userId,
        userCheckError,
        userExists
      })
      return NextResponse.json(
        { success: false, error: 'User profile not found. Please complete onboarding first.' },
        { status: 400 }
      )
    }

    console.log('✅ CHAPTER CREATION: User verified, now validating input')

    // Validation (after user existence check)
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!Object.values(TIMEZONE_TYPES).includes(type as any)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time zone type' },
        { status: 400 }
      )
    }

    console.log('✅ CHAPTER CREATION: Validation passed, creating timezone')

    // Create timezone in Supabase
    const insertData = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      start_date: startDate || null,
      end_date: endDate || null,
      location: location?.trim() || null,
      header_image_url: headerImageUrl || null,
      invite_code: type === TIMEZONE_TYPES.GROUP ? generateInviteCode() : null,
      creator_id: user.userId
    }
    
    console.log('📝 CHAPTER CREATION: Insert data:', insertData)

    const { data: chapter, error: createError } = await supabase
      .from('chapters')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('❌ CHAPTER CREATION: Database insert error:', {
        error: createError,
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        insertData
      })
      return NextResponse.json(
        { success: false, error: `Failed to create timezone: ${createError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ CHAPTER CREATION: Chapter created successfully:', chapter)

    // Add creator as member
    const { error: memberError } = await supabase
      .from('chapter_members')
      .insert({
        chapter_id: chapter.id,
        user_id: user.userId,
        role: MEMBER_ROLES.CREATOR
      })

    if (memberError) {
      console.error('Create member error:', memberError)
    }

    // Transform response to match expected format
    const transformedChapter = {
      ...chapter,
      startDate: chapter.start_date,
      endDate: chapter.end_date,
      inviteCode: chapter.invite_code,
      createdById: chapter.creator_id,
      createdAt: chapter.created_at,
      updatedAt: chapter.updated_at,
      creator: { id: user.userId, email: user.email },
      members: [{ user: { id: user.userId, email: user.email }, role: MEMBER_ROLES.CREATOR }],
      _count: { members: 1, memories: 0 }
    }

    return NextResponse.json({
      success: true,
      data: transformedChapter,
      message: 'Chapter created successfully'
    })

  } catch (error) {
    console.error('Create time zone error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 