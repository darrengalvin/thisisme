import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const timezoneId = params.id

    // Use service role client
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

    // Check if timezone exists and user has permission
    const { data: existingTimezone, error: fetchError } = await supabase
      .from('timezones')
      .select('id, creator_id, header_image_url')
      .eq('id', timezoneId)
      .single()

    if (fetchError || !existingTimezone) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator
    if (existingTimezone.creator_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const location = formData.get('location') as string
    const headerImageFile = formData.get('headerImage') as File
    const removeHeaderImage = formData.get('removeHeaderImage') === 'true'

    console.log('📝 CHAPTER UPDATE: Form data received:', {
      title, description, startDate, endDate, location,
      hasHeaderImage: !!headerImageFile,
      removeHeaderImage,
      timezoneId
    })

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    // Handle header image update
    let headerImageUrl = existingTimezone.header_image_url
    
    if (removeHeaderImage) {
      // Remove the existing image from Supabase Storage
      if (existingTimezone.header_image_url) {
        try {
          // Extract file path from Supabase URL
          const urlParts = existingTimezone.header_image_url.split('/files/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            const { error: deleteError } = await supabase.storage
              .from('files')
              .remove([filePath])
            
            if (deleteError) {
              console.error('❌ CHAPTER UPDATE: Failed to remove old image from storage:', deleteError)
            } else {
              console.log('🗑️ CHAPTER UPDATE: Removed old header image from storage')
            }
          }
        } catch (unlinkError) {
          console.error('❌ CHAPTER UPDATE: Failed to remove old image:', unlinkError)
        }
      }
      headerImageUrl = null
    } else if (headerImageFile && headerImageFile.size > 0) {
      try {
        console.log('🖼️ CHAPTER UPDATE: Processing new header image upload')
        
        // Remove old image from Supabase Storage if it exists
        if (existingTimezone.header_image_url) {
          try {
            const urlParts = existingTimezone.header_image_url.split('/files/')
            if (urlParts.length > 1) {
              const oldFilePath = urlParts[1]
              const { error: deleteError } = await supabase.storage
                .from('files')
                .remove([oldFilePath])
              
              if (deleteError) {
                console.error('❌ CHAPTER UPDATE: Failed to remove old image from storage:', deleteError)
              } else {
                console.log('🗑️ CHAPTER UPDATE: Removed old header image from storage')
              }
            }
          } catch (unlinkError) {
            console.error('❌ CHAPTER UPDATE: Failed to remove old image:', unlinkError)
          }
        }
        
        // Upload new image to Supabase Storage
        const bytes = await headerImageFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const fileExtension = headerImageFile.name.split('.').pop() || 'jpg'
        const fileName = `${uuidv4()}.${fileExtension}`
        const filePath = `uploads/${user.userId}/${fileName}`
        
        console.log('📁 CHAPTER UPDATE: Uploading new file to Supabase Storage:', filePath)
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, buffer, {
            contentType: headerImageFile.type,
            upsert: false
          })
        
        if (uploadError) {
          console.error('❌ CHAPTER UPDATE: Supabase Storage upload error:', uploadError)
          return NextResponse.json(
            { success: false, error: `Failed to upload header image: ${uploadError.message}` },
            { status: 500 }
          )
        }
        
        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath)
        
        console.log('✅ CHAPTER UPDATE: New file uploaded successfully:', publicUrl)
        headerImageUrl = publicUrl
      } catch (fileError) {
        console.error('💥 CHAPTER UPDATE: File upload error:', fileError)
        return NextResponse.json(
          { success: false, error: 'Failed to upload header image' },
          { status: 500 }
        )
      }
    }

    // Update timezone in Supabase
    const { data: updatedTimezone, error: updateError } = await supabase
      .from('timezones')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        location: location?.trim() || null,
        header_image_url: headerImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', timezoneId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ CHAPTER UPDATE: Database update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update chapter' },
        { status: 500 }
      )
    }

    // Transform response to match expected format
    const transformedTimezone = {
      ...updatedTimezone,
      startDate: updatedTimezone.start_date,
      endDate: updatedTimezone.end_date,
      headerImageUrl: updatedTimezone.header_image_url,
      inviteCode: updatedTimezone.invite_code,
      createdById: updatedTimezone.creator_id,
      createdAt: updatedTimezone.created_at,
      updatedAt: updatedTimezone.updated_at
    }

    console.log('✅ CHAPTER UPDATE: Successfully updated')
    return NextResponse.json({
      success: true,
      data: transformedTimezone,
      message: 'Chapter updated successfully'
    })

  } catch (error) {
    console.error('💥 CHAPTER UPDATE: Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const timezoneId = params.id

    // Use service role client
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

    // Check if timezone exists and user has permission
    const { data: existingTimezone, error: fetchError } = await supabase
      .from('timezones')
      .select('id, creator_id, header_image_url, title')
      .eq('id', timezoneId)
      .single()

    if (fetchError || !existingTimezone) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator
    if (existingTimezone.creator_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    console.log('🗑️ CHAPTER DELETE: Deleting chapter:', { 
      timezoneId, 
      title: existingTimezone.title,
      userId: user.userId 
    })

    // First, delete all memories in this timezone
    const { error: memoriesDeleteError } = await supabase
      .from('memories')
      .delete()
      .eq('timezone_id', timezoneId)

    if (memoriesDeleteError) {
      console.error('❌ CHAPTER DELETE: Failed to delete memories:', memoriesDeleteError)
    } else {
      console.log('✅ CHAPTER DELETE: Memories deleted')
    }

    // Delete timezone members
    const { error: membersDeleteError } = await supabase
      .from('timezone_members')
      .delete()
      .eq('timezone_id', timezoneId)

    if (membersDeleteError) {
      console.error('❌ CHAPTER DELETE: Failed to delete members:', membersDeleteError)
    } else {
      console.log('✅ CHAPTER DELETE: Members deleted')
    }

    // Delete the timezone
    const { error: deleteError } = await supabase
      .from('timezones')
      .delete()
      .eq('id', timezoneId)

    if (deleteError) {
      console.error('❌ CHAPTER DELETE: Database delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete chapter' },
        { status: 500 }
      )
    }

    // Delete header image from Supabase Storage if it exists
    if (existingTimezone.header_image_url) {
      try {
        // Extract file path from Supabase URL
        const urlParts = existingTimezone.header_image_url.split('/files/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          const { error: deleteError } = await supabase.storage
            .from('files')
            .remove([filePath])
          
          if (deleteError) {
            console.error('❌ CHAPTER DELETE: Failed to remove header image from storage:', deleteError)
          } else {
            console.log('🗑️ CHAPTER DELETE: Removed header image from storage')
          }
        }
      } catch (unlinkError) {
        console.error('❌ CHAPTER DELETE: Failed to remove header image:', unlinkError)
        // Don't fail the request if we can't delete the file
      }
    }

    console.log('✅ CHAPTER DELETE: Successfully deleted')
    return NextResponse.json({
      success: true,
      message: 'Chapter deleted successfully'
    })

  } catch (error) {
    console.error('💥 CHAPTER DELETE: Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 