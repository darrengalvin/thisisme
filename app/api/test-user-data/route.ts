import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing user data...')
    
    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at')
      .limit(5)
    
    if (usersError) {
      console.error('Users error:', usersError)
      return NextResponse.json({ error: 'Failed to get users', details: usersError.message }, { status: 500 })
    }
    
    console.log('👥 Users found:', users?.length)
    
    // Get all memory boards
    const { data: boards, error: boardsError } = await supabaseAdmin
      .from('memory_boards')
      .select('*')
      .limit(10)
    
    if (boardsError) {
      console.error('Boards error:', boardsError)
      return NextResponse.json({ error: 'Failed to get boards', details: boardsError.message }, { status: 500 })
    }
    
    console.log('📋 Boards found:', boards?.length)
    
    // Get all board memberships
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('board_memberships')
      .select('*')
      .limit(10)
    
    if (membershipsError) {
      console.error('Memberships error:', membershipsError)
      return NextResponse.json({ error: 'Failed to get memberships', details: membershipsError.message }, { status: 500 })
    }
    
    console.log('👤 Memberships found:', memberships?.length)
    
    return NextResponse.json({ 
      success: true,
      data: {
        users: users || [],
        boards: boards || [],
        memberships: memberships || []
      }
    })
  } catch (error: any) {
    console.error('Failed to test user data:', error)
    return NextResponse.json(
      { error: 'Failed to test user data', details: error.message },
      { status: 500 }
    )
  }
}
