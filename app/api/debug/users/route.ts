import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Fetching all users from database')
    
    // Get all users from the users table
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, birth_year, created_at, is_admin')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('🔍 DEBUG: Found users:', users?.length || 0)
    
    return NextResponse.json({
      success: true,
      users: users || [],
      count: users?.length || 0
    })
    
  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
