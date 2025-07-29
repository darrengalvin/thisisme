import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = await verifyToken(token)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Use service role client to bypass RLS for profile lookup
    console.log('🔍 PROFILE API: Using service role client for profile lookup')
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

    // Get user profile from Supabase using service role (bypasses RLS)
    console.log('🔍 PROFILE API: Looking up user profile for:', user.userId)
    console.log('🔍 PROFILE API: User JWT details:', { userId: user.userId, email: user.email })
    
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year, created_at, updated_at')
      .eq('id', user.userId)
      .maybeSingle()

    console.log('🔍 PROFILE API: Raw Supabase response (with service role):', { 
      userProfile, 
      error: error?.code,
      errorMessage: error?.message,
      errorDetails: error
    })

    // Also try to check if user exists with a count query for debugging
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('id', user.userId)
    
    console.log('🔍 PROFILE API: User count check (with service role):', { count, countError })

    if (error && error.code !== 'PGRST116') {
      console.error('Get user profile error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // If user doesn't exist in the users table, return basic info from JWT
    if (!userProfile) {
      console.log('⚠️ PROFILE API: No user profile found even with service role - record truly missing')
      console.log('⚠️ PROFILE API: This indicates a problem with the onboarding process')
      return NextResponse.json({
        success: true,
        data: {
          id: user.userId,
          email: user.email,
          birthYear: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }

    console.log('✅ PROFILE API: User profile found with service role:', {
      id: userProfile.id,
      email: userProfile.email,
      birthYear: userProfile.birth_year,
      createdAt: userProfile.created_at
    })

    // Convert to camelCase for consistency
    const profileData = {
      id: userProfile.id,
      email: userProfile.email,
      birthYear: userProfile.birth_year,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const { birthYear } = await request.json()

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

    // Create Supabase client using service role to bypass RLS
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

    // Try to update the user profile
    const { data: userProfile, error } = await supabase
      .from('users')
      .update({ birth_year: birthYear })
      .eq('id', user.userId)
      .select('id, email, birth_year, created_at, updated_at')
      .maybeSingle()

    if (error) {
      console.error('Update user profile error:', error)
      
      // If the user doesn't exist, they need to complete onboarding
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'User profile not found. Please complete onboarding.' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to update user profile' },
        { status: 500 }
      )
    }

    // If no data returned but no error, still means user doesn't exist
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Convert to camelCase for consistency
    const profileData = {
      id: userProfile.id,
      email: userProfile.email,
      birthYear: userProfile.birth_year,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 