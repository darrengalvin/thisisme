import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    console.log('🔍 Testing current user:', userId)
    
    // Get current user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('User error:', userError)
      return NextResponse.json({ error: 'Failed to get user', details: userError.message }, { status: 500 })
    }
    
    console.log('👤 Current user:', user)
    
    // Get user's boards
    const { data: boards, error: boardsError } = await supabaseAdmin
      .from('memory_boards')
      .select('*')
      .eq('owner_id', userId)
    
    if (boardsError) {
      console.error('Boards error:', boardsError)
      return NextResponse.json({ error: 'Failed to get boards', details: boardsError.message }, { status: 500 })
    }
    
    console.log('📋 User boards:', boards?.length)
    
    // Get user's memberships
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('board_memberships')
      .select('*')
      .eq('user_id', userId)
    
    if (membershipsError) {
      console.error('Memberships error:', membershipsError)
      return NextResponse.json({ error: 'Failed to get memberships', details: membershipsError.message }, { status: 500 })
    }
    
    console.log('👤 User memberships:', memberships?.length)
    
    return NextResponse.json({ 
      success: true,
      data: {
        user,
        boards: boards || [],
        memberships: memberships || []
      }
    })
  } catch (error) {
    console.error('Failed to test current user:', error)
    return NextResponse.json(
      { error: 'Failed to test current user', details: error.message },
      { status: 500 }
    )
  }
}
