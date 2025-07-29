import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { generateInviteCode } from '@/lib/utils'
import { TIMEZONE_TYPES, MEMBER_ROLES } from '@/lib/types'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

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

    // Get all timezones for the user
    const { data: timeZones, error: dbError } = await supabase
      .from('timezones')
      .select(`
        *,
        creator:users!timezones_creator_id_fkey(id, email),
        members:timezone_members(
          id,
          role,
          user:users(id, email)
        )
      `)
      .eq('creator_id', user.userId)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedTimeZones = timeZones?.map((tz: any) => {
      console.log('🖼️ TRANSFORM CHAPTER:', tz.title, 'header_image_url:', tz.header_image_url)
      return {
        ...tz,
        id: tz.id,
        title: tz.title,
        description: tz.description,
        type: tz.type,
        startDate: tz.start_date,
        endDate: tz.end_date,
        location: tz.location,
        headerImageUrl: tz.header_image_url, // Transform header image URL
        inviteCode: tz.invite_code,
        createdById: tz.creator_id,
        createdAt: tz.created_at,
        updatedAt: tz.updated_at,
        creator: tz.creator,
        members: tz.members || [],
        _count: {
          members: tz.members?.length || 0,
          memories: 0 // TODO: Add memories count
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      timeZones: transformedTimeZones
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

    // Validation
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

    // Handle header image upload if provided (FormData flow only)
    if (headerImageFile && headerImageFile.size > 0) {
      try {
        console.log('🖼️ CHAPTER HEADER: Processing header image upload')
        const bytes = await headerImageFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Generate unique filename
        const fileExtension = path.extname(headerImageFile.name)
        const fileName = `${uuidv4()}${fileExtension}`
        const filePath = path.join(process.cwd(), 'public', 'uploads', fileName)
        
        console.log('📁 CHAPTER HEADER: Saving file:', { fileName, filePath })
        await writeFile(filePath, buffer)
        console.log('✅ CHAPTER HEADER: File saved successfully')
        
        headerImageUrl = `/uploads/${fileName}`
      } catch (fileError) {
        console.error('💥 CHAPTER HEADER: File upload error:', fileError)
        // Continue without header image rather than failing the chapter creation
      }
    }

    // Check environment variables
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

    console.log('✅ CHAPTER CREATION: User verified, creating timezone')

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

    const { data: timeZone, error: createError } = await supabase
      .from('timezones')
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

    console.log('✅ CHAPTER CREATION: Timezone created successfully:', timeZone)

    // Add creator as member
    const { error: memberError } = await supabase
      .from('timezone_members')
      .insert({
        timezone_id: timeZone.id,
        user_id: user.userId,
        role: MEMBER_ROLES.CREATOR
      })

    if (memberError) {
      console.error('Create member error:', memberError)
    }

    // Transform response to match expected format
    const transformedTimeZone = {
      ...timeZone,
      startDate: timeZone.start_date,
      endDate: timeZone.end_date,
      inviteCode: timeZone.invite_code,
      createdById: timeZone.creator_id,
      createdAt: timeZone.created_at,
      updatedAt: timeZone.updated_at,
      creator: { id: user.userId, email: user.email },
      members: [{ user: { id: user.userId, email: user.email }, role: MEMBER_ROLES.CREATOR }],
      _count: { members: 1, memories: 0 }
    }

    return NextResponse.json({
      success: true,
      data: transformedTimeZone,
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