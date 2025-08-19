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
  
  // TRY 2: variableValues (newer VAPI approach - check CORRECT location)
  const variableValues = call?.assistantOverrides?.variableValues || call?.variableValues || arguments[2]?.variableValues
  if (variableValues?.userId) {
    console.log('🔍 ✅ TRY 2 SUCCESS: Found userId in assistantOverrides.variableValues:', variableValues.userId)
    return variableValues.userId
  } else {
    console.log('🔍 ❌ TRY 2 FAILED: No userId in variableValues')
    console.log('🔍 call.assistantOverrides:', call?.assistantOverrides)
    console.log('🔍 call.variableValues:', call?.variableValues)
    console.log('🔍 Full call structure:', JSON.stringify(call, null, 2))
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

// Get user context tool - UPDATED to require userId parameter
async function getUserContextForTool(parameters, call, urlUserId = null) {
  const { age, year, context_type, userId: paramUserId } = parameters
  
  // PRIORITY: Use userId from tool parameters (Maya should include this)
  let userId = paramUserId
  if (!userId) {
    // FALLBACK: Extract from call data if Maya didn't include it
    userId = await extractUserIdFromCall(call, null, urlUserId)
  }
  
  console.log('👤 TOOL PARAMETER userId:', paramUserId)
  console.log('👤 EXTRACTED userId:', userId)
  console.log('👤 FINAL userId to use:', userId)
  
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

    // Get chapters (from timezones table)
    const { data: chapters, error: chaptersError } = await supabase
      .from('timezones')
      .select('*')
      .eq('creator_id', userId)
      .order('start_date', { ascending: true })

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
        
        // Add date information for temporal reasoning
        if (chapter.start_date || chapter.end_date) {
          const startYear = chapter.start_date ? new Date(chapter.start_date).getFullYear() : null
          const endYear = chapter.end_date ? new Date(chapter.end_date).getFullYear() : null
          
          if (startYear && endYear) {
            response += ` (${startYear}-${endYear})`
          } else if (startYear) {
            response += ` (${startYear}-present)`
          }
        }
        
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

// Create chapter tool
async function createChapterForTool(parameters, call, urlUserId = null) {
  const { title, start_year, end_year, description, userId: paramUserId } = parameters
  
  console.log('📚 🚀 CHAPTER CREATION STARTING')
  console.log('📚 Title:', title)
  console.log('📚 Start Year:', start_year)
  console.log('📚 End Year:', end_year)
  console.log('📚 Description:', description)
  
  // Get userId - prioritize parameter, then fallback
  let userId = paramUserId
  if (!userId) {
    userId = await extractUserIdFromCall(call, null, urlUserId)
  }
  
  console.log('📚 👤 Final userId for chapter:', userId)
  
  if (!userId || userId === 'NOT_FOUND') {
    return "❌ I need to know who you are to create a chapter. Please make sure you're logged in."
  }
  
  if (!title || !start_year) {
    return "❌ I need at least a title and start year to create a chapter."
  }

  try {
    // Insert chapter into database (using 'timezones' table with correct column names)
    const insertData = {
      creator_id: userId,  // correct column name
      title: title,
      type: 'PRIVATE',     // default type
      start_date: new Date(parseInt(start_year), 0, 1).toISOString(),  // convert year to date
      description: description || null
    }
    
    // Add end_date if end_year is provided
    if (end_year) {
      insertData.end_date = new Date(parseInt(end_year), 11, 31).toISOString()  // convert year to date
    }
    
    const { data: chapter, error } = await supabase
      .from('timezones')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('📚 ❌ Chapter creation failed:', error)
      return `❌ Failed to create chapter: ${error.message}`
    }

    console.log('📚 ✅ Chapter created successfully:', chapter.id)
    
    // Format years for natural speech
    const startYearText = start_year === '2020' ? 'twenty twenty' : 
                         start_year === '2021' ? 'twenty twenty-one' :
                         start_year === '2022' ? 'twenty twenty-two' :
                         start_year === '2023' ? 'twenty twenty-three' :
                         start_year === '2024' ? 'twenty twenty-four' :
                         start_year === '2025' ? 'twenty twenty-five' :
                         `year ${start_year}`
    
    const endYearText = end_year === '2020' ? 'twenty twenty' : 
                       end_year === '2021' ? 'twenty twenty-one' :
                       end_year === '2022' ? 'twenty twenty-two' :
                       end_year === '2023' ? 'twenty twenty-three' :
                       end_year === '2024' ? 'twenty twenty-four' :
                       end_year === '2025' ? 'twenty twenty-five' :
                       end_year ? `year ${end_year}` : null
    
    return `✅ Perfect! I've created your "${title}" chapter${endYearText ? ` covering ${startYearText} to ${endYearText}` : ` starting in ${startYearText}`}. ${description ? `${description}` : ''} Feel free to add any pictures or videos to bring your chapter to life, or you can do this later. You can now tell me about memories from this time period and I'll organize them for you!`

  } catch (error) {
    console.error('📚 💥 Chapter creation error:', error)
    return `❌ Sorry, I had trouble creating that chapter: ${error.message}`
  }
}

// Save memory tool  
async function saveMemoryForTool(parameters, call, urlUserId = null) {
  const { title, content, year, age, location, userId: paramUserId } = parameters
  
  console.log('💭 🚀 MEMORY CREATION STARTING')
  console.log('💭 Title:', title)
  console.log('💭 Content:', content)
  console.log('💭 Year:', year)
  console.log('💭 Location:', location)
  
  // Get userId - prioritize parameter, then fallback
  let userId = paramUserId
  if (!userId) {
    userId = await extractUserIdFromCall(call, null, urlUserId)
  }
  
  console.log('💭 👤 Final userId for memory:', userId)
  
  if (!userId || userId === 'NOT_FOUND') {
    return "❌ I need to know who you are to save a memory. Please make sure you're logged in."
  }
  
  if (!title || !content) {
    return "❌ I need at least a title and some content to save your memory."
  }

  try {
    // Insert memory into database
    const insertData = {
      user_id: userId,
      title: title,
      content: content,
      year: year ? parseInt(year) : null,
      location: location || null
    }
    
    const { data: memory, error } = await supabase
      .from('memories')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('💭 ❌ Memory creation failed:', error)
      return `❌ Failed to save memory: ${error.message}`
    }

    console.log('💭 ✅ Memory saved successfully:', memory.id)
    return `✅ Perfect! I've saved your "${title}" memory. Feel free to add any pictures or videos to it, or you can do this later. What other memories would you like to share?`

  } catch (error) {
    console.error('💭 💥 Memory creation error:', error)
    return `❌ Sorry, I had trouble saving that memory: ${error.message}`
  }
}

// Search memories tool
async function searchMemoriesForTool(parameters, call, urlUserId = null) {
  console.log('🔍 Memory search requested but not implemented yet')
  return "🔍 Memory search feature is coming soon! For now, you can browse your timeline in the main interface."
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

        // Enhanced logging for debugging
        console.log(`🔧 📞 TOOL CALL: ${functionName}`)
        console.log('🔧 📋 TOOL ARGS:', JSON.stringify(functionArgs, null, 2))

        let result = "Tool not yet implemented for new VAPI format..."

        switch (functionName) {
          case 'get-user-context':
            console.log('🔧 ✅ EXECUTING: get-user-context')
            result = await getUserContextForTool(functionArgs, call, urlUserId)
            break
            
          case 'create-chapter':
            console.log('🔧 📚 CHAPTER CREATION REQUESTED!')
            console.log('🔧 📚 CHAPTER ARGS:', functionArgs)
            result = await createChapterForTool(functionArgs, call, urlUserId)
            break
            
          case 'save-memory':
            console.log('🔧 💭 MEMORY SAVE REQUESTED!')
            result = await saveMemoryForTool(functionArgs, call, urlUserId)
            break
            
          case 'search-memories':
            console.log('🔧 🔍 MEMORY SEARCH REQUESTED!')
            result = await searchMemoriesForTool(functionArgs, call, urlUserId)
            break
          
          default:
            console.log(`🔧 ❌ UNKNOWN TOOL: ${functionName}`)
            result = `❌ Tool "${functionName}" not yet implemented. Available tools: get-user-context, create-chapter, save-memory, search-memories`
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
