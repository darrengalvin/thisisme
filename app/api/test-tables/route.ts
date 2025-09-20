import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing table existence...')
    
    // Test if collaborative tables exist
    const tables = [
      'memory_boards',
      'board_memberships', 
      'user_networks',
      'memory_tags',
      'memory_board_associations',
      'notifications'
    ]
    
    const results: any = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1)
        
        results[table] = {
          exists: !error,
          error: error?.message || null,
          count: data?.length || 0
        }
        
        console.log(`✅ Table ${table}:`, results[table])
      } catch (err: any) {
        results[table] = {
          exists: false,
          error: err.message,
          count: 0
        }
        console.log(`❌ Table ${table}:`, results[table])
      }
    }
    
    return NextResponse.json({ 
      success: true,
      tables: results 
    })
  } catch (error: any) {
    console.error('Failed to test tables:', error)
    return NextResponse.json(
      { error: 'Failed to test tables', details: error.message },
      { status: 500 }
    )
  }
}
