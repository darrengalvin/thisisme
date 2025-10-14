import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { getFileType } from '@/lib/utils'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { formatZodErrors, sanitizeInput } from '@/lib/validation'

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
      console.log('🎭 MEMORIES: Admin viewing as user:', { admin: user.userId, target: impersonatingUserId })
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

    // Get chapters the user created
    const { data: ownedChapters } = await supabase
      .from('timezones')
      .select('id')
      .eq('creator_id', targetUserId)

    // Get chapters the user is a member of
    const { data: memberChapters } = await supabase
      .from('timezone_members')
      .select('timezone_id')
      .eq('user_id', targetUserId)

    const ownedIds = ownedChapters?.map(ch => ch.id) || []
    const memberIds = memberChapters?.map(m => m.timezone_id) || []
    const chapterIds = Array.from(new Set([...ownedIds, ...memberIds]))

    // Get all memories from chapters the user has access to
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select(`
        *,
        user:users!memories_user_id_fkey(id, email, full_name),
        chapter:chapters!memories_chapter_id_fkey(id, title, type),
        media(*)
      `)
      .in('chapter_id', chapterIds.length > 0 ? chapterIds : ['no-chapters'])
      .order('created_at', { ascending: false })

    if (memoriesError) {
      console.error('Database error:', memoriesError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedMemories = memories?.map(memory => ({
      ...memory,
      id: memory.id,
      title: memory.title,
      textContent: memory.text_content,
      userId: memory.user_id,
      timeZoneId: memory.chapter_id, // Keep timeZoneId for backward compatibility
      datePrecision: memory.date_precision,
      approximateDate: memory.approximate_date,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
      user: memory.user,
      timeZone: memory.timezone,
      media: memory.media || []
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedMemories
    })

  } catch (error) {
    console.error('Get memories error:', error)
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

    console.log('Creating memory for user:', user.userId)

    const formData = await request.formData()
    
    // 🛡️ VALIDATION: Extract and validate form data
    const rawTitle = formData.get('title') as string
    const rawTextContent = formData.get('textContent') as string
    const rawTimeZoneId = formData.get('timeZoneId') as string
    const rawCustomDate = formData.get('customDate') as string
    const rawDatePrecision = formData.get('datePrecision') as string
    const rawApproximateDate = formData.get('approximateDate') as string
    const rawTaggedPeopleJson = formData.get('taggedPeople') as string
    const files = formData.getAll('media') as File[]

    // Parse tagged people JSON
    let taggedPeople: string[] = [];
    if (rawTaggedPeopleJson) {
      try {
        const parsed = JSON.parse(rawTaggedPeopleJson);
        taggedPeople = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid tagged people format' },
          { status: 400 }
        );
      }
    }

    // Validate input data
    const memoryDataSchema = z.object({
      title: z.string().max(200, 'Title too long (max 200 characters)').optional(),
      textContent: z.string().min(1, 'Content is required').max(10000, 'Content too long (max 10,000 characters)'),
      timeZoneId: z.string().uuid('Invalid chapter ID').optional(),
      customDate: z.string().optional(),
      datePrecision: z.enum(['exact', 'month', 'year', 'approximate', 'era']).optional(),
      approximateDate: z.string().max(100, 'Approximate date too long').optional(),
      taggedPeople: z.array(z.string()).max(50, 'Too many tagged people (max 50)').optional(),
    });

    // Validate all data
    let validatedData;
    try {
      validatedData = memoryDataSchema.parse({
        title: rawTitle || undefined,
        textContent: rawTextContent,
        timeZoneId: rawTimeZoneId || undefined,
        customDate: rawCustomDate || undefined,
        datePrecision: rawDatePrecision || undefined,
        approximateDate: rawApproximateDate || undefined,
        taggedPeople: taggedPeople.length > 0 ? taggedPeople : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = formatZodErrors(error);
        console.error('❌ Validation error:', errorMessages);
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: errorMessages },
          { status: 400 }
        );
      }
      throw error;
    }

    // Sanitize text inputs to prevent XSS
    const title = validatedData.title ? sanitizeInput(validatedData.title, 200) : null;
    const textContent = sanitizeInput(validatedData.textContent, 10000);
    const timeZoneId = validatedData.timeZoneId || null;
    const customDate = validatedData.customDate || null;
    const datePrecision = validatedData.datePrecision || null;
    const approximateDate = validatedData.approximateDate ? sanitizeInput(validatedData.approximateDate, 100) : null;

    // Validate file uploads
    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Too many files (max 10 per memory)' },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { success: false, error: `File ${file.name} is too large (max 10MB per file)` },
          { status: 400 }
        );
      }
    }

    console.log('✅ Validated form data:', {
      title,
      textContent: textContent?.length || 0,
      timeZoneId,
      customDate,
      datePrecision,
      approximateDate,
      filesCount: files.length,
      taggedPeopleCount: taggedPeople.length
    })

    // Verify user exists in database using service role client
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
    
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.userId)
      .maybeSingle()

    if (userError || !userExists) {
      console.error('User not found in database:', user.userId, userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // If no timeZone specified, assign to user's default private time zone
    let finalTimeZoneId = timeZoneId
    if (!timeZoneId) {
      const { data: defaultTimeZone, error: defaultError } = await supabase
        .from('chapters')
        .select('id')
        .eq('creator_id', user.userId)
        .eq('type', 'PRIVATE')
        .maybeSingle()

      if (defaultTimeZone && !defaultError) {
        finalTimeZoneId = defaultTimeZone.id
        console.log('Auto-assigned to default private time zone:', finalTimeZoneId)
      }
    }

    // Validation (time zone is optional for personal memories)
    if (finalTimeZoneId) {
      console.log('Checking timezone membership for:', finalTimeZoneId)
      
      // Verify timezone exists and user has access
      const { data: timeZoneExists, error: timeZoneError } = await supabase
        .from('chapters')
        .select('id, creator_id')
        .eq('id', finalTimeZoneId)
        .maybeSingle()

      if (timeZoneError || !timeZoneExists) {
        console.error('TimeZone not found:', finalTimeZoneId, timeZoneError)
        return NextResponse.json(
          { success: false, error: 'Time zone not found' },
          { status: 404 }
        )
      }

      // Check if user is the creator or a member of the time zone
      if (timeZoneExists.creator_id !== user.userId) {
        const { data: membership, error: memberError } = await supabase
          .from('chapter_members')
          .select('id')
          .eq('chapter_id', finalTimeZoneId)
          .eq('user_id', user.userId)
          .maybeSingle()

        if (memberError || !membership) {
          console.error('User not a member of timezone:', { timeZoneId: finalTimeZoneId, userId: user.userId, memberError })
          return NextResponse.json(
            { success: false, error: 'Access denied to this time zone' },
            { status: 403 }
          )
        }
      }
    }

    if (!textContent?.trim() && files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content or media is required' },
        { status: 400 }
      )
    }

    // Create memory with custom date if provided
    const memoryDate = customDate ? new Date(customDate) : new Date()
    
    console.log('Creating memory with data:', {
      title: title?.trim() || null,
      textContent: textContent?.trim() || null,
      userId: user.userId,
      timeZoneId: finalTimeZoneId || null,
      datePrecision: datePrecision || null,
      approximateDate: approximateDate || null,
      createdAt: memoryDate
    })
    
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        title: title?.trim() || null,
        text_content: textContent?.trim() || null,
        user_id: user.userId,
        chapter_id: finalTimeZoneId || null,
        date_precision: datePrecision || null,
        approximate_date: approximateDate || null,
        memory_date: memoryDate.toISOString(), // When the actual memory event happened
        created_at: new Date().toISOString(),   // When the record was created in the system
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memoryError) {
      console.error('Failed to create memory:', memoryError)
      return NextResponse.json(
        { success: false, error: 'Failed to create memory' },
        { status: 500 }
      )
    }

    console.log('Memory created successfully:', memory.id)

    // Handle file uploads
    const mediaRecords = []
    
    console.log('🖼️ MEDIA UPLOAD: Starting file processing for', files.length, 'files')
    
    for (const file of files) {
      console.log('📁 PROCESSING FILE:', {
        name: file.name,
        size: file.size,
        type: file.type,
        isEmpty: file.size === 0
      })
      
      if (file.size > 0) {
        try {
          // Generate unique filename for Supabase Storage
          const fileId = uuidv4()
          const fileExtension = file.name.split('.').pop()
          const fileName = `${fileId}.${fileExtension}`
          const filePath = `uploads/${user.userId}/${fileName}`

          console.log('💾 UPLOADING TO SUPABASE STORAGE:', { fileName, filePath })

          // Upload file to Supabase Storage
          const bytes = await file.arrayBuffer()
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, bytes, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            })

          if (uploadError) {
            console.error('❌ SUPABASE STORAGE UPLOAD FAILED:', uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(filePath)

          console.log('✅ FILE UPLOADED TO SUPABASE:', { path: uploadData.path, publicUrl })

          // Determine media type
          const mediaType = getFileType(file.type)
          console.log('🎯 MEDIA TYPE:', mediaType, 'from MIME:', file.type)
          
          // Create media record
          console.log('📝 CREATING MEDIA RECORD:', {
            memory_id: memory.id,
            type: mediaType.toUpperCase(),
            storage_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
          })
          
          const { data: mediaRecord, error: mediaError } = await supabase
            .from('media')
            .insert({
              memory_id: memory.id,
              type: mediaType,
              storage_url: publicUrl,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type
            })
            .select()
            .single()

          if (mediaError) {
            console.error('❌ MEDIA RECORD CREATION FAILED:', mediaError)
            continue
          }

          console.log('✅ MEDIA RECORD CREATED:', mediaRecord)
          mediaRecords.push(mediaRecord)
        } catch (fileError) {
          console.error('💥 FILE UPLOAD ERROR:', fileError)
          // Continue with other files
        }
      } else {
        console.log('⚠️ SKIPPING EMPTY FILE:', file.name)
      }
    }
    
    console.log('🏁 MEDIA UPLOAD COMPLETE:', mediaRecords.length, 'records created')

    // Handle tagged people
    if (taggedPeople && taggedPeople.length > 0) {
      console.log('🏷️ PROCESSING TAGGED PEOPLE:', taggedPeople)
      
      for (const personName of taggedPeople) {
        // Find or create person in user's network
        let { data: networkPerson } = await supabase
          .from('user_networks')
          .select('id')
          .eq('owner_id', user.userId)
          .eq('person_name', personName)
          .single()

        if (!networkPerson) {
          // Create new person in network
          const { data: newPerson } = await supabase
            .from('user_networks')
            .insert({
              owner_id: user.userId,
              person_name: personName
            })
            .select('id')
            .single()

          networkPerson = newPerson
        }

        if (networkPerson) {
          // Create memory tag
          await supabase
            .from('memory_tags')
            .insert({
              memory_id: memory.id,
              tagged_person_id: networkPerson.id,
              tagged_by_user_id: user.userId
            })
        }
      }
    }

    // Get complete memory with relations
    const { data: completeMemory, error: fetchError } = await supabase
      .from('memories')
      .select(`
        *,
        user:users!memories_user_id_fkey(id, email),
        chapter:chapters!memories_chapter_id_fkey(id, title, type),
        media(*)
      `)
      .eq('id', memory.id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch complete memory:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch created memory' },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedMemory = {
      ...completeMemory,
      id: completeMemory.id,
      title: completeMemory.title,
      textContent: completeMemory.text_content,
      userId: completeMemory.user_id,
      timeZoneId: completeMemory.chapter_id, // Keep timeZoneId for backward compatibility
      datePrecision: completeMemory.date_precision,
      approximateDate: completeMemory.approximate_date,
      createdAt: completeMemory.created_at,
      updatedAt: completeMemory.updated_at,
      user: completeMemory.user,
      timeZone: completeMemory.timezone,
      media: completeMemory.media || []
    }

    return NextResponse.json({
      success: true,
      data: transformedMemory,
      message: 'Memory created successfully'
    })

  } catch (error) {
    console.error('Create memory error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 