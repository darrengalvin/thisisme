import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TESTING CONVERSATIONS DEBUG ENDPOINT')
    
    // Get all conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ CONVERSATIONS ERROR:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        conversations: []
      })
    }
    
    console.log('💬 CONVERSATIONS FOUND:', conversations?.length || 0)
    
    // Test creating a conversation
    const testUserId = 'test-user-debug'
    const { data: testConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: testUserId,
        summary: 'Debug test conversation',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    let testResult = 'success'
    if (insertError) {
      console.error('❌ INSERT ERROR:', insertError)
      testResult = insertError.message
    }
    
    return NextResponse.json({
      success: true,
      totalConversations: conversations?.length || 0,
      conversations: conversations || [],
      testInsert: testResult,
      testConversation: testConv,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ DEBUG CONVERSATIONS ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
