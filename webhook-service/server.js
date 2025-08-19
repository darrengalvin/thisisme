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

// User ID extraction function (copied from your working code)
function extractUserIdFromCall(call, authenticatedUserId = null) {
  if (authenticatedUserId) {
    return authenticatedUserId
  }
  
  if (call?.customer?.userId) {
    return call.customer.userId
  }
  
  // CRITICAL: Check assistantOverrides.metadata (where VAPI actually puts it)
  if (call?.assistantOverrides?.metadata?.userId) {
    return call.assistantOverrides.metadata.userId
  }
  
  if (call?.metadata?.userId) {
    return call.metadata.userId
  }
  
  if (call?.client?.variableValues?.userId) {
    return call.client.variableValues.userId
  }
  
  if (call?.variableValues?.userId) {
    return call.variableValues.userId
  }
  
  if (call?.userId) {
    return call.userId
  }
  
  return null
}

// Get user context tool
async function getUserContextForTool(parameters, call, authenticatedUserId = null) {
  const { age, year, context_type } = parameters
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  // CRITICAL DEBUG: Log the exact call data we receive
  console.log('🔥 CRITICAL DEBUG - Call data:', JSON.stringify({
    customer: call?.customer,
    metadata: call?.metadata,
    assistantOverrides: call?.assistantOverrides,
    variableValues: call?.variableValues
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
  // Minimal logging - only essential info
  console.log('🎤 WEBHOOK CALL:', timestamp)

  try {
    const body = req.body
    const { message, call } = body

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
            // Get user context
            result = await getUserContextForTool(functionArgs, call)
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
