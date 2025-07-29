import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { promises as fs, existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

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
      // Remove the existing image
      if (existingTimezone.header_image_url) {
        try {
          const imagePath = path.join(process.cwd(), 'public', existingTimezone.header_image_url)
          if (existsSync(imagePath)) {
            await fs.unlink(imagePath)
            console.log('🗑️ CHAPTER UPDATE: Removed old header image')
          }
        } catch (unlinkError) {
          console.error('❌ CHAPTER UPDATE: Failed to remove old image:', unlinkError)
        }
      }
      headerImageUrl = null
    } else if (headerImageFile && headerImageFile.size > 0) {
      try {
        console.log('🖼️ CHAPTER UPDATE: Processing new header image upload')
        
        // Remove old image if it exists
        if (existingTimezone.header_image_url) {
          try {
            const oldImagePath = path.join(process.cwd(), 'public', existingTimezone.header_image_url)
            if (existsSync(oldImagePath)) {
              await fs.unlink(oldImagePath)
              console.log('🗑️ CHAPTER UPDATE: Removed old header image')
            }
          } catch (unlinkError) {
            console.error('❌ CHAPTER UPDATE: Failed to remove old image:', unlinkError)
          }
        }
        
        // Upload new image
        const bytes = await headerImageFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const fileExtension = path.extname(headerImageFile.name)
        const fileName = `${uuidv4()}${fileExtension}`
        const filePath = path.join(process.cwd(), 'public', 'uploads', fileName)
        
        console.log('📁 CHAPTER UPDATE: Saving new file:', { fileName, filePath })
        await fs.writeFile(filePath, buffer)
        console.log('✅ CHAPTER UPDATE: New file saved successfully')
        
        headerImageUrl = `/uploads/${fileName}`
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

    // Delete header image file if it exists
    if (existingTimezone.header_image_url) {
      try {
        const imagePath = path.join(process.cwd(), 'public', existingTimezone.header_image_url)
        if (existsSync(imagePath)) {
          await fs.unlink(imagePath)
          console.log('🗑️ CHAPTER DELETE: Removed header image file')
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