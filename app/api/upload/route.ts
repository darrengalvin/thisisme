import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 UPLOAD API: Processing file upload request')
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ UPLOAD API: Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify authentication - check Authorization header first, then fall back to cookies
    let token: string | null = null
    
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
      console.log('🔑 UPLOAD API: Using token from Authorization header')
    }
    
    // Fall back to cookies if no Authorization header
    if (!token) {
      const cookieStore = cookies()
      token = cookieStore.get('auth-token')?.value || null
      if (token) {
        console.log('🔑 UPLOAD API: Using token from cookies')
      }
    }
    
    if (!token) {
      console.log('❌ UPLOAD API: No auth token found in header or cookies')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ UPLOAD API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    console.log('🔑 UPLOAD API: Authenticated user:', user.userId)

    // Log request details for debugging
    console.log('📤 UPLOAD API: Headers:', Object.fromEntries(request.headers.entries()))
    console.log('📤 UPLOAD API: Content-Type:', request.headers.get('content-type'))
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    console.log('📤 UPLOAD API: Form data keys:', Array.from(formData.keys()))
    console.log('📤 UPLOAD API: File details:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    })
    
    if (!file) {
      console.log('❌ UPLOAD API: No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('📁 UPLOAD API: Processing file:', file.name, 'Size:', file.size)

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      console.log('❌ UPLOAD API: File too large:', file.size)
      return NextResponse.json({ error: 'File must be smaller than 10MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ UPLOAD API: Invalid file type:', file.type)
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Please use JPEG, PNG, GIF, WebP, or AVIF images.`,
        allowedTypes 
      }, { status: 400 })
    }

    // Create Supabase client with service role for file uploads
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

    // Generate unique filename with original extension, organized by user
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `uploads/${user.userId}/${fileName}`

    console.log('💾 UPLOAD API: Uploading to Supabase Storage:', filePath)

    // Convert file to buffer for Supabase
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('files') // Make sure this bucket exists in your Supabase project
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('❌ UPLOAD API: Supabase Storage error:', error)
      return NextResponse.json({ 
        error: `Failed to upload file: ${error.message}` 
      }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath)

    console.log('✅ UPLOAD API: File uploaded successfully:', publicUrl)

    return NextResponse.json({ 
      url: publicUrl,
      filename: fileName,
      originalName: file.name,
      size: file.size,
      path: filePath
    })

  } catch (error) {
    console.error('❌ UPLOAD API: Upload failed:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 