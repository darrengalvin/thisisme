import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TEST USER NETWORKS: Starting database test...')
    
    // Test 1: Try a simple query to see if table exists and what structure it has
    const { data: testData, error: queryError } = await supabaseAdmin
      .from('user_networks')
      .select('*')
      .limit(1)
    
    console.log('🔍 TEST QUERY:', { testData, queryError })
    
    if (queryError) {
      // Check if it's a "table doesn't exist" error
      if (queryError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'user_networks table does not exist',
          details: queryError
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: queryError
      }, { status: 500 })
    }
    
    // Test 2: Try to get table structure by attempting to insert a test record
    const testRecord = {
      owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      person_name: 'Test Record',
      person_email: 'test@example.com'
    }
    
    const { data: insertTest, error: insertError } = await supabaseAdmin
      .from('user_networks')
      .insert(testRecord)
      .select()
    
    console.log('🔍 INSERT TEST:', { insertTest, insertError })
    
    // Clean up test record if it was created
    if (insertTest && insertTest.length > 0) {
      await supabaseAdmin
        .from('user_networks')
        .delete()
        .eq('id', insertTest[0].id)
    }
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      testQuery: {
        data: testData,
        error: queryError
      },
      insertTest: {
        data: insertTest,
        error: insertError
      }
    })
    
  } catch (error) {
    console.error('❌ TEST USER NETWORKS ERROR:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
