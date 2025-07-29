import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 UPLOAD API: Processing file upload request')
    
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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ UPLOAD API: Invalid file type:', file.type)
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name)
    const fileName = `${uuidv4()}${fileExtension}`
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadsDir, fileName)

    console.log('💾 UPLOAD API: Saving to:', filePath)

    // Ensure uploads directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/${fileName}`
    console.log('✅ UPLOAD API: File uploaded successfully:', fileUrl)

    return NextResponse.json({ 
      url: fileUrl,
      filename: fileName,
      originalName: file.name,
      size: file.size
    })

  } catch (error) {
    console.error('❌ UPLOAD API: Upload failed:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 