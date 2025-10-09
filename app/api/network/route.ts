import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'
import { addPersonSchema, formatZodErrors, sanitizeInput } from '@/lib/validation'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

// Get user's personal network
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 NETWORK API: Starting GET request')
    
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ NETWORK API: No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 NETWORK API: Verifying token...')
    
    const user = await verifyToken(token)
    if (!user) {
      console.log('❌ NETWORK API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ NETWORK API: Token verified for user:', user.userId)

    console.log('🔍 NETWORK API: Querying user_networks with chapter access...')
    
    // ⚡ PERFORMANCE FIX: Fetch people AND their chapter access in a single query
    // This eliminates N+1 queries (1 query for people + N queries for each person's chapters)
    const { data: networkPeople, error } = await supabaseAdmin
      .from('user_networks')
      .select(`
        *,
        chapter_access:pending_chapter_invitations
      `)
      .eq('owner_id', user.userId)
      .order('person_name')

    if (error) {
      console.error('❌ NETWORK API: Database error:', error)
      throw error
    }

    console.log('✅ NETWORK API: Query successful, found', networkPeople?.length || 0, 'people with chapter data')

    return NextResponse.json({
      success: true,
      people: networkPeople || []
    })
  } catch (error) {
    console.error('❌ NETWORK API: Failed to fetch user network:', error)
    // 🛡️ SECURITY: Track errors in Sentry
    Sentry.captureException(error, {
      tags: { api: 'network' },
      extra: { message: 'Failed to fetch user network' }
    })
    return NextResponse.json(
      { error: 'Failed to fetch network' },
      { status: 500 }
    )
  }
}

// Add person to user's network
export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
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
    
    // 🛡️ SECURITY: Validate and sanitize input with Zod
    let validatedData
    try {
      validatedData = addPersonSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = formatZodErrors(error)
        return NextResponse.json(
          { error: 'Invalid input', details: errorMessages },
          { status: 400 }
        )
      }
      throw error
    }

    const { person_name, person_email, person_phone, relationship, notes, photo_url, selectedChapters = [] } = validatedData
    
    // Sanitize text inputs to prevent XSS
    const sanitizedName = sanitizeInput(person_name, 100)
    const sanitizedRelationship = relationship ? sanitizeInput(relationship, 50) : null
    const sanitizedNotes = notes ? sanitizeInput(notes, 1000) : null

    const insertData = {
      owner_id: user.userId,
      person_name: sanitizedName,
      person_email: person_email?.toLowerCase() || null,
      person_phone: person_phone || null,
      relationship: sanitizedRelationship,
      notes: sanitizedNotes,
      photo_url: photo_url || null,
      pending_chapter_invitations: selectedChapters
    }
    
    console.log('📝 ABOUT TO INSERT PERSON:', insertData)

    // 🛡️ SECURITY: Use sanitized data for database insert
    const { data: newPerson, error } = await supabaseAdmin
      .from('user_networks')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ DATABASE INSERT ERROR:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('✅ PERSON ADDED SUCCESSFULLY:', newPerson)
    return NextResponse.json({
      success: true,
      person: newPerson
    })
  } catch (error) {
    console.error('❌ FAILED TO ADD PERSON TO NETWORK:', {
      error,
      errorType: typeof error,
      errorString: String(error),
      errorJSON: JSON.stringify(error, null, 2)
    })
    
    // 🛡️ SECURITY: Track errors in Sentry
    Sentry.captureException(error, {
      tags: { api: 'network/post' },
      extra: { 
        message: 'Failed to add person to network',
        errorDetails: error
      }
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to add person',
        details: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}
