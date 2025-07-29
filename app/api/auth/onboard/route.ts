import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, birthYear } = await request.json()

    console.log('🔍 ONBOARD API: Received request:', { userId, email, birthYear })

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate birthYear if provided
    if (birthYear !== null && birthYear !== undefined) {
      const currentYear = new Date().getFullYear()
      if (typeof birthYear !== 'number' || birthYear < 1900 || birthYear > currentYear) {
        return NextResponse.json(
          { success: false, error: 'Birth year must be between 1900 and current year' },
          { status: 400 }
        )
      }
    }

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ ONBOARD API: Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log('✅ ONBOARD API: Using service role key to create profile')

    // Use service role client to bypass RLS for onboarding
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create or update user profile
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        birth_year: birthYear
      }, {
        onConflict: 'id'
      })
      .select('id, email, birth_year, created_at, updated_at')
      .single()

    if (error) {
      console.error('❌ ONBOARD API: Profile creation error:', {
        code: error.code,
        message: error.message,
        details: error,
        userId,
        email
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    console.log('✅ ONBOARD API: Profile created successfully:', {
      userId: data.id,
      email: data.email,
      birthYear: data.birth_year
    })

    // Convert to camelCase for consistency
    const profileData = {
      id: data.id,
      email: data.email,
      birthYear: data.birth_year,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 