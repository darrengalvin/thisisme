import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TEST USER NETWORKS: Starting database test...')
    
    // Test 1: Check if table exists
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_networks')
    
    console.log('🔍 TABLE EXISTS CHECK:', { tableCheck, tableError })
    
    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check table existence',
        details: tableError
      }, { status: 500 })
    }
    
    if (!tableCheck || tableCheck.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'user_networks table does not exist',
        tableCheck
      }, { status: 404 })
    }
    
    // Test 2: Check table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_networks')
      .order('ordinal_position')
    
    console.log('🔍 TABLE COLUMNS:', { columns, columnsError })
    
    if (columnsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get table structure',
        details: columnsError
      }, { status: 500 })
    }
    
    // Test 3: Try a simple query
    const { data: testData, error: queryError } = await supabaseAdmin
      .from('user_networks')
      .select('*')
      .limit(1)
    
    console.log('🔍 TEST QUERY:', { testData, queryError })
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns,
      testQuery: {
        data: testData,
        error: queryError
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
