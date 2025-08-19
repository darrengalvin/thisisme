const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// TRIPLE FALLBACK USER ID EXTRACTION - handles all three approaches from frontend
async function extractUserIdFromCall(call, authenticatedUserId = null, urlUserId = null) {
  console.log('🔍 🚀 TRIPLE FALLBACK USER ID EXTRACTION STARTING')
  console.log('🔍 URL userId parameter:', urlUserId)
  console.log('🔍 Authenticated userId:', authenticatedUserId)
  console.log('🔍 Call object keys:', call ? Object.keys(call) : 'No call object')
  
  // TRY 1: URL parameter (fallback approach)
  if (urlUserId) {
    console.log('🔍 ✅ TRY 1 SUCCESS: Found userId in webhook URL:', urlUserId)
    return urlUserId
  } else {
    console.log('🔍 ❌ TRY 1 FAILED: No userId in URL parameters')
  }
  
  // TRY 2: variableValues (newer VAPI approach - check multiple locations)
  const variableValues = call?.variableValues || arguments[2]?.variableValues || arguments[2]?.message?.variableValues
  if (variableValues?.userId) {
    console.log('🔍 ✅ TRY 2 SUCCESS: Found userId in variableValues:', variableValues.userId)
    return variableValues.userId
  } else {
    console.log('🔍 ❌ TRY 2 FAILED: No userId in variableValues')
    console.log('🔍 variableValues content:', variableValues)
    console.log('🔍 Full request args:', Object.keys(arguments[2] || {}))
  }
  
  // TRY 3: metadata (original approach)
  if (call?.metadata?.userId) {
    console.log('🔍 ✅ TRY 3 SUCCESS: Found userId in metadata:', call.metadata.userId)
    return call.metadata.userId
  } else {
    console.log('🔍 ❌ TRY 3 FAILED: No userId in metadata')
    console.log('🔍 metadata content:', call?.metadata)
  }
  
  if (authenticatedUserId) {
    console.log('🔍 ✅ FALLBACK: Using authenticated userId:', authenticatedUserId)
    return authenticatedUserId
  }
  
  // Additional checks for other possible locations
  if (call?.assistantOverrides?.metadata?.userId) {
    console.log('🔍 ✅ BACKUP: Found userId in assistantOverrides:', call.assistantOverrides.metadata.userId)
    return call.assistantOverrides.metadata.userId
  }
  
  // PRIORITY 4: Check for sessionId as fallback
  const sessionId = 
    call?.metadata?.sessionId ||
    call?.assistantOverrides?.metadata?.sessionId ||
    call?.variableValues?.sessionId;
  
  if (sessionId) {
    console.log('🔍 Found sessionId as fallback:', sessionId)
    
    // Lookup session in Supabase
    try {
      const { data, error } = await supabase
        .from('vapi_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()
      
      if (data && !error) {
        console.log('✅ Session found! User ID:', data.user_id)
        console.log('📋 User data from session:', data.user_data)
        
        // Store user data in global context for tools to use
        global.vapiUserContext = {
          userId: data.user_id,
          userData: data.user_data
        }
        
        return data.user_id
      } else {
        console.log('❌ Session not found or expired:', sessionId)
      }
    } catch (err) {
      console.log('❌ Session lookup failed:', err.message)
    }
  }
  
  // Other fallback methods
  if (call?.customer?.userId) {
    return call.customer.userId
  }
  
  if (call?.client?.variableValues?.userId) {
    return call.client.variableValues.userId
  }
  
  if (call?.userId) {
    return call.userId
  }
  
  console.log('❌ No user ID found in any source (URL, metadata, call data)')
  return null
}

// Get user context tool
async function getUserContextForTool(parameters, call, urlUserId = null) {
  const { age, year, context_type } = parameters
  const userId = await extractUserIdFromCall(call, null, urlUserId)
  
  // CRITICAL DEBUG: Log the ENTIRE payload structure we receive from VAPI
  console.log('🔥 CRITICAL DEBUG - Full request body keys:', Object.keys(arguments[2] || {}))
  console.log('🔥 CRITICAL DEBUG - Call data:', JSON.stringify({
    customer: call?.customer,
    metadata: call?.metadata,
    assistantOverrides: call?.assistantOverrides,
    variableValues: call?.variableValues,
    // Check if user data is in the call object itself
    callCustomer: call?.customer,
    callMetadata: call?.metadata,
    // Check the entire call object structure
    fullCall: call
  }, null, 2))
  console.log('👤 Extracted user ID:', userId)
  
  if (!userId || userId === 'NOT_FOUND') {
    return "I need to know who you are to access your timeline. Please configure user identification in VAPI."
  }

  try {
    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, birth_year')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('👤 User not found:', userError)
      return "I couldn't find your user profile. Please make sure you're logged in."
    }

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('user_id', userId)
      .order('start_year', { ascending: true })

    // Get memories count
    const { count: memoriesCount, error: memoriesError } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const userName = user.email?.split('@')[0] || 'there'
    const currentYear = new Date().getFullYear()
    const currentAge = user.birth_year ? currentYear - user.birth_year : null

    let response = `Hi ${userName}! I now have access to your timeline data:\n\n`
    response += `👤 **Your Profile:**\n`
    response += `- Name: ${userName}\n`
    response += `- Email: ${user.email}\n`
    if (user.birth_year) {
      response += `- Birth Year: ${user.birth_year}\n`
      response += `- Current Age: ${currentAge}\n`
    }

    if (chapters && chapters.length > 0) {
      response += `\n📚 **Your Chapters (${chapters.length}):**\n`
      chapters.forEach((chapter, index) => {
        response += `${index + 1}. ${chapter.title}`
        if (chapter.description) {
          response += ` - ${chapter.description}`
        }
        response += `\n`
      })
    }

    response += `\n💭 **Your Memories:** You have ${memoriesCount || 0} memories saved\n`
    response += `\nI'm ready to help you capture new memories, search existing ones, or organize your timeline!`

    return response

  } catch (error) {
    console.error('👤 Error getting user context:', error)
    return "I'm having trouble accessing your timeline data right now. Please try again."
  }
}

// VAPI Webhook Handler
app.post('/vapi/webhook', async (req, res) => {
  const timestamp = new Date().toISOString()
  console.log('🎤 WEBHOOK CALL:', timestamp)

  try {
    const body = req.body
    const { message } = body
    
    // Support both message.call and message.chat (newer VAPI format)
    const call = message?.call || message?.chat || body.call
    
    // FALLBACK: Extract user ID from URL parameter if VAPI doesn't send call context
    const urlUserId = req.query.userId
    console.log('🔧 FALLBACK: URL userId parameter:', urlUserId)
    
    // CRITICAL DEBUG: Log the complete request structure from VAPI
    console.log('🔥 FULL VAPI REQUEST STRUCTURE:', JSON.stringify({
      messageType: message?.type,
      hasCall: !!call,
      callKeys: call ? Object.keys(call) : [],
      bodyKeys: Object.keys(body),
      // Log the complete call object to see where user data might be
      completeCall: call
    }, null, 2))

    if (message?.type === 'tool-calls') {
      // Handle tool calls with minimal logging
      const toolCalls = message.toolCallList || message.toolCalls || []

      const results = []

      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id
        const functionName = toolCall.name || toolCall.function?.name
        const functionArgs = toolCall.arguments || toolCall.function?.arguments || {}

        // Process tool call

        let result = "Tool not yet implemented for new VAPI format..."

        switch (functionName) {
          case 'get-user-context':
            // Get user context - use URL userId as fallback if call context is empty
            result = await getUserContextForTool(functionArgs, call, urlUserId)
            break
          
          default:
            result = `${functionName} tool not yet implemented for new VAPI format...`
        }

        results.push({
          toolCallId: toolCallId,
          result: result
        })
      }

      // Return results to VAPI
      return res.json({ results })
    }

    // Handle other message types
    console.log('🎤 Non-tool message type:', message?.type)
    return res.json({ success: true, message: 'Webhook received' })

  } catch (error) {
    console.error('🎤 VAPI WEBHOOK: Error processing webhook:', error)
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'VAPI Webhook Service for Maya',
    endpoints: {
      webhook: '/vapi/webhook',
      health: '/health'
    }
  })
})

app.listen(port, () => {
  console.log(`🚀 VAPI Webhook Service running on port ${port}`)
  console.log(`🔗 Webhook URL: http://localhost:${port}/vapi/webhook`)
})
