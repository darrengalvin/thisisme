import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Helper function to extract user ID from VAPI call object
function extractUserIdFromCall(call: any, authenticatedUserId: string | null): string | null {
  // If we have an authenticated user ID from the URL parameters, use that first
  if (authenticatedUserId) {
    return authenticatedUserId
  }
  
  // VAPI's recommended approach: extract from customer field
  if (call?.customer?.userId) {
    return call.customer.userId
  }
  
  // CRITICAL: Check assistantOverrides.metadata (where VAPI actually puts it)
  if (call?.assistantOverrides?.metadata?.userId) {
    return call.assistantOverrides.metadata.userId
  }
  
  // Alternative: extract from metadata field
  if (call?.metadata?.userId) {
    return call.metadata.userId
  }
  
  // VAPI's variableValues format (newer approach) - try multiple locations
  if (call?.client?.variableValues?.userId) {
    return call.client.variableValues.userId
  }
  
  // Alternative variableValues locations
  if (call?.variableValues?.userId) {
    return call.variableValues.userId
  }
  
  // Check if variableValues is at root level
  if (call?.userId) {
    return call.userId
  }
  
  // Legacy fallbacks (less reliable)
  if (call?.customerData?.userId) {
    return call.customerData.userId
  } else if (call?.user?.id) {
    return call.user.id
  } else if (call?.userId) {
    return call.userId
  }
  
  // No valid user ID found
  return null
}

// VAPI Webhook Handler for Memory Assistant
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log('🎤 VAPI WEBHOOK: ========== NEW WEBHOOK CALL ==========')
  console.log('🎤 VAPI WEBHOOK: Timestamp:', timestamp)
  console.log('🎤 VAPI WEBHOOK: URL:', request.url)
  console.log('🎤 VAPI WEBHOOK: Method:', request.method)
  console.log('🎤 VAPI WEBHOOK: Headers:', Object.fromEntries(request.headers.entries()))
  
  // ALWAYS log webhook received - even if it fails later
  try {
    const { addWebhookLog } = await import('@/lib/webhook-logger')
    await addWebhookLog({
      type: 'webhook_received',
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: timestamp
    })
  } catch (e) {
    console.log('🎤 VAPI WEBHOOK: Failed to log webhook received:', e)
  }

  try {
    // Enhanced console logging for debugging
    console.log('🎤 VAPI WEBHOOK: Enhanced logging active')
    
    // Extract user authentication from URL parameters
    const url = new URL(request.url)
    const authToken = url.searchParams.get('token')
    const userIdParam = url.searchParams.get('userId')
    const webhookSecret = url.searchParams.get('secret')
    
    // Allow public access for VAPI webhooks (VAPI doesn't use webhook secrets)
    // VAPI authenticates via API keys, not webhook secrets
    console.log('🔐 VAPI WEBHOOK: Allowing public access for VAPI integration')
    // Skip authentication checks for VAPI webhook calls
    
    console.log('🔐 AUTH CHECK: Token present:', !!authToken)
    console.log('🔐 AUTH CHECK: User ID param:', userIdParam)
    console.log('🔐 AUTH CHECK: Full URL params:', Object.fromEntries(url.searchParams.entries()))
    console.log('🔐 AUTH CHECK: Full URL:', request.url)
    
    // Verify user authentication
    let authenticatedUserId: string | null = null
    
    if (authToken) {
      try {
        const { verifyToken } = await import('@/lib/auth')
        const userInfo = await verifyToken(authToken)
        
        if (userInfo) {
          authenticatedUserId = userInfo.userId
          console.log('🔐 AUTH SUCCESS: Verified user:', authenticatedUserId)
        } else {
          console.log('🔐 AUTH FAILED: Invalid token')
        }
      } catch (error) {
        console.log('🔐 AUTH ERROR:', error)
      }
    } else if (userIdParam) {
      // Direct user ID parameter (less secure, but simpler)
      authenticatedUserId = userIdParam
      console.log('🔐 AUTH PARAM: Using user ID parameter:', authenticatedUserId)
    }
    
    const body = await request.json()
    
    console.log('🎤 VAPI WEBHOOK: ========== RAW BODY ==========')
    console.log('🎤 VAPI WEBHOOK: Body type:', typeof body)
    console.log('🎤 VAPI WEBHOOK: Body keys:', Object.keys(body || {}))
    console.log('🎤 VAPI WEBHOOK: Full body:', JSON.stringify(body, null, 2))
    console.log('🎤 VAPI WEBHOOK: ========== END RAW BODY ==========')
    
    // Log the body to webhook monitor
    try {
      const { addWebhookLog } = await import('@/lib/webhook-logger')
      console.log('🔥 ADDING WEBHOOK LOG TO MONITOR')
      await addWebhookLog({
        type: 'webhook_received',
        body: body,
        bodyType: typeof body,
        bodyKeys: Object.keys(body || {}),
        conversationContext: {
          messageType: body?.message?.type,
          toolCallCount: body?.message?.toolCallList?.length || 0,
          userId: extractUserIdFromCall(body?.call, authenticatedUserId),
          callId: body?.call?.id,
          timestamp: new Date().toISOString()
        }
      })
      console.log('🔥 WEBHOOK LOG ADDED SUCCESSFULLY')
    } catch (e) {
      console.error('🔥 ERROR ADDING WEBHOOK LOG:', e)
    }
    
    // Check for empty or malformed payload
    if (!body || typeof body !== 'object') {
      console.error('🎤 VAPI WEBHOOK: Invalid or empty payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    
    const { type, call, message } = body
    
    console.log('🎤 VAPI WEBHOOK: Event type:', type)
    console.log('🎤 VAPI WEBHOOK: Call ID:', call?.id)
    console.log('🎤 VAPI WEBHOOK: Message type:', message?.type)
    console.log('🎤 VAPI WEBHOOK: Has message:', !!message)
    console.log('🎤 VAPI WEBHOOK: Has call:', !!call)
    
    // Enhanced debugging for undefined type
    if (type === undefined) {
      console.log('🔍 DEBUGGING UNDEFINED TYPE:')
      console.log('🔍 Body keys:', Object.keys(body))
      console.log('🔍 Body type:', typeof body)
      console.log('🔍 Raw body:', body)
      console.log('🔍 Type value:', type, 'typeof:', typeof type)
      
      // Check for alternative event type fields
      const possibleTypeFields = ['eventType', 'event', 'messageType', 'webhookType', 'message.type']
      possibleTypeFields.forEach(field => {
        if (body[field] !== undefined) {
          console.log(`🔍 Found alternative type field '${field}':`, body[field])
        }
      })
      
      // Check if this is a message-based webhook format
      if (body.message && body.message.type) {
        console.log('🔍 Found message.type:', body.message.type)
        // Handle the message-based format
        return handleMessageBasedWebhook(body, authenticatedUserId)
      }
      
      // For now, return success to avoid errors
      console.log('🔍 Returning success for undefined type to avoid errors')
      return NextResponse.json({ success: true, message: 'Event type undefined but handled gracefully' })
    }
    
    switch (type) {
      case 'function-call':
        return handleFunctionCall(body, authenticatedUserId)
      
      case 'call-start':
        return handleCallStart(body)
      
      case 'call-end':
        return handleCallEnd(body)
      
      case 'transcript':
        return handleTranscript(body)
      
      default:
        console.log('🎤 VAPI WEBHOOK: Unhandled event type:', type)
        return NextResponse.json({ success: true })
    }
    
  } catch (error) {
    console.error('🎤 VAPI WEBHOOK: Error processing webhook:', error)
    
    // Log the error to webhook monitor
    try {
      const { addWebhookLog } = await import('@/lib/webhook-logger')
      await addWebhookLog({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown webhook processing error',
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.log('🎤 VAPI WEBHOOK: Failed to log error:', e)
    }
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle function calls from VAPI (when AI wants to save memories, etc.)
async function handleFunctionCall(body: any, authenticatedUserId: string | null = null) {
  const { functionCall, call } = body
  const { name, parameters } = functionCall
  
  console.log('🎤 VAPI FUNCTION CALL:', name, parameters)
  console.log('🎤 FUNCTION CALL DETAILS:', {
    functionName: name,
    parameters: parameters,
    callId: call?.id,
    userId: call?.customer?.userId || call?.metadata?.userId || 'NOT_FOUND',
    timestamp: new Date().toISOString()
  })
  
  try {
    let result
    const startTime = Date.now()
    
    switch (name) {
      case 'save-memory':
        console.log('💾 STARTING save-memory function')
        result = await saveMemory(parameters, call, authenticatedUserId)
        break
      
      case 'search-memories':
        console.log('🔍 STARTING search-memories function')
        result = await searchMemories(parameters, call, authenticatedUserId)
        break
      
      case 'get-user-context':
        console.log('👤 STARTING get-user-context function')
        result = await getUserContext(parameters, call, authenticatedUserId)
        break
      
      case 'upload-media':
        console.log('📸 STARTING upload-media function')
        result = await uploadMedia(parameters, call, authenticatedUserId)
        break
      
      case 'create-chapter':
        console.log('📚 STARTING create-chapter function')
        result = await createChapter(parameters, call, authenticatedUserId)
        break
      
      case 'save-birth-year':
        console.log('🎂 STARTING save-birth-year function')
        result = await saveBirthYear(parameters, call, authenticatedUserId)
        break
      
      default:
        console.log('❌ UNKNOWN FUNCTION:', name)
        result = NextResponse.json({
          result: `Function ${name} not implemented yet`
        })
    }
    
    const duration = Date.now() - startTime
    const resultData = await result.json()
    const status = result.status
    
    console.log('✅ FUNCTION COMPLETED:', {
      functionName: name,
      status: status,
      success: status === 200,
      duration: `${duration}ms`,
      result: resultData.result?.substring(0, 100) + (resultData.result?.length > 100 ? '...' : ''),
      hasError: !!resultData.error,
      timestamp: new Date().toISOString()
    })
    
    // Return a new response with the same data
    return NextResponse.json(resultData, { status })
    
  } catch (error) {
    console.error('🎤 VAPI FUNCTION ERROR:', error)
    return NextResponse.json(
      {
        error: `I'm having trouble with that right now. Our technical team has been notified. Please try again in a few minutes.`,
        result: `Sorry, I'm experiencing technical difficulties and can't ${name.replace('-', ' ')} right now. Please try again later.`
      },
      { status: 500 }
    )
  }
}

// Save a memory to the database
async function saveMemory(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { 
    title, 
    content, 
    timeframe, 
    age, 
    year, 
    location, 
    people, 
    chapter, 
    sensory_details,
    tags 
  } = parameters
  
  console.log('💾 SAVING MEMORY:', { title, timeframe, age, year, location, chapter })
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
    
    console.log('💾 SAVE MEMORY - User ID:', userId)
    console.log('💾 SAVE MEMORY - Parameters:', JSON.stringify(parameters, null, 2))
  
  try {
    // Get user's birth year for age calculations
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('birth_year')
      .eq('id', userId)
      .single()
    
    const userBirthYear = userProfile?.birth_year
    
    console.log('💾 SAVE MEMORY - User birth year:', userBirthYear)
    
    // Calculate approximate date from age or year
    let approximateDate = timeframe
    if (age && !approximateDate && userBirthYear) {
      const calculatedYear = userBirthYear + parseInt(age)
      approximateDate = `Age ${age} (${calculatedYear})`
    } else if (age && !approximateDate) {
      approximateDate = `Age ${age}`
    }
    if (year && !approximateDate) {
      approximateDate = year.toString()
    }

    // Build content with additional details
    let fullContent = content
    if (location) {
      fullContent += `\n\nLocation: ${location}`
    }
    if (people && people.length > 0) {
      fullContent += `\n\nPeople: ${people.join(', ')}`
    }
    if (sensory_details) {
      fullContent += `\n\nDetails: ${sensory_details}`
    }

    // Create memory using Supabase
    const { data: memory, error } = await supabaseAdmin
      .from('memories')
      .insert({
        title: title || 'Voice Memory',
        text_content: fullContent,
        user_id: userId,
        approximate_date: approximateDate,
        date_precision: year ? 'exact' : 'approximate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('💾 SAVE MEMORY - Database error:', error)
      throw error
    }
    
    console.log('💾 MEMORY SAVED SUCCESSFULLY:', {
      memoryId: memory.id,
      title: memory.title,
      userId: userId,
      approximateDate: approximateDate
    })
    
    // Create response based on what was saved
    let response = `Perfect! I've saved "${title || 'that memory'}" to your timeline.`
    
    if (approximateDate) {
      response += ` I've placed it around ${approximateDate}.`
    }
    
    if (chapter) {
      response += ` It's in your ${chapter} chapter.`
    }
    
    response += ' What else would you like to share?'
    
    return NextResponse.json({
      result: response,
      memoryId: memory.id,
      success: true
    })
    
  } catch (error) {
    console.error('💾 SAVE MEMORY ERROR:', error)
    return NextResponse.json(
      {
        error: "Failed to save memory to database",
        result: "Sorry, I'm having trouble saving memories right now. Our technical team has been notified. Please try again in a few minutes.",
        success: false
      },
      { status: 500 }
    )
  }
}

// Search existing memories for organization and context
async function searchMemories(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { query, timeframe, age, year, chapter_name } = parameters
  
  console.log('🔍 SEARCHING MEMORIES:', { query, timeframe, age, year, chapter_name })
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('🔍 SEARCH MEMORIES - User ID:', userId)
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('🔍 ERROR: No valid user identification from VAPI')
    return NextResponse.json({
      error: "User identification required",
      result: "I need to know who you are to search your memories. Please configure user identification in VAPI.",
      success: false
    }, { status: 400 })
  }
  
  try {
    let supabaseQuery = supabaseAdmin
      .from('memories')
      .select('id, title, text_content, approximate_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Apply search filters
    if (query) {
      // Search in title or content
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,text_content.ilike.%${query}%`)
    }
    
    if (timeframe || age || year) {
      const searchTerm = timeframe || (age ? `Age ${age}` : year?.toString())
      if (searchTerm) {
        supabaseQuery = supabaseQuery.ilike('approximate_date', `%${searchTerm}%`)
      }
    }

    const { data: memories, error } = await supabaseQuery
    if (error) throw error
    
    if (!memories || memories.length === 0) {
      if (age || year) {
        return NextResponse.json({
          result: `I don't see any memories from that time yet. This would be a great first memory for that period!`,
          memories: [],
          suggested_action: 'create_new_chapter'
        })
      }
      return NextResponse.json({
        result: `I couldn't find memories matching that. Tell me more about what you're thinking of.`,
        memories: []
      })
    }
    
    // Group memories by approximate timeframe for chapter suggestions
    const memoryGroups: { [key: string]: any[] } = {}
    memories.forEach(memory => {
      const timeKey = memory.approximate_date || 'Unknown time'
      if (!memoryGroups[timeKey]) {
        memoryGroups[timeKey] = []
      }
      memoryGroups[timeKey].push(memory)
    })
    
    // Create helpful response for organization
    if (age || year) {
      const timeGroups = Object.keys(memoryGroups)
      if (timeGroups.length > 1) {
        return NextResponse.json({
          result: `I found memories from that time in ${timeGroups.length} different periods: ${timeGroups.join(', ')}. Which timeframe does your new memory fit with?`,
          memories: memories,
          time_groups: memoryGroups
        })
      }
    }
    
    const memoryList = memories.slice(0, 3).map(m => 
      `"${m.title}" ${m.approximate_date ? `(${m.approximate_date})` : ''}`
    ).join(', ')
    
    return NextResponse.json({
      result: `I found ${memories.length} related memories: ${memoryList}. Does your new memory connect to any of these?`,
      memories: memories,
      suggested_action: 'organize_with_existing'
    })
    
  } catch (error) {
    console.error('🔍 SEARCH MEMORIES ERROR:', error)
    return NextResponse.json(
      {
        error: "Failed to search memories",
        result: "I'm having trouble searching your memories right now. Let me just save this as a new memory instead.",
        memories: []
      },
      { status: 500 }
    )
  }
}

// Get user context for timeline organization
async function getUserContext(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { age, year, context_type } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('👤 GETTING USER CONTEXT for:', userId, { age, year, context_type })
  console.log('👤 CALL OBJECT:', JSON.stringify(call, null, 2))
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('👤 ERROR: No valid user identification from VAPI')
    return NextResponse.json({
      error: "User identification required",
      result: "I need to know who you are to access your timeline. Please configure user identification in VAPI.",
      success: false
    }, { status: 400 })
  }
  
  try {
    // Get user profile data (including birth year)
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year, created_at')
      .eq('id', userId)
      .single()
    
    if (userError) {
      console.error('👤 USER PROFILE ERROR:', userError)
      return NextResponse.json({
        error: "User not found",
        result: `I can't find your user profile. Please check your VAPI configuration.`,
        success: false
      }, { status: 404 })
    }
    
    console.log('👤 USER PROFILE FOUND:', {
      userId: userId,
      birthYear: userProfile?.birth_year,
      email: userProfile?.email,
      hasProfile: !!userProfile
    })
    
    // Get user's name for personalization
    const userName = userProfile?.email?.split('@')[0] || 'there'
    
    // Get user's chapters (timezones)
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from('timezones')
      .select('id, title, description, start_date, end_date, location')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
    
    if (chaptersError) {
      console.error('👤 CHAPTERS ERROR:', chaptersError)
    } else {
      console.log('👤 CHAPTERS FOUND:', {
        userId: userId,
        chapterCount: chapters?.length || 0,
        chapterTitles: chapters?.map(c => c.title) || []
      })
    }
    
    // Get memories organized by timeframe
    const { data: memories, error } = await supabaseAdmin
      .from('memories')
      .select('id, title, approximate_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    const memoryCount = memories?.length || 0
    
    if (context_type === 'timeline_overview') {
      // Group memories by time periods for chapter suggestions
      const timeGroups: { [key: string]: any[] } = {}
      memories?.forEach(memory => {
        const timeKey = memory.approximate_date || 'Unknown time'
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = []
        }
        timeGroups[timeKey].push(memory)
      })
      
      const chapters = Object.keys(timeGroups)
      
      if (chapters.length > 0) {
        return NextResponse.json({
          result: `You have memories organized in ${chapters.length} time periods: ${chapters.slice(0, 3).join(', ')}${chapters.length > 3 ? ' and more' : ''}. What time period is your new memory from?`,
          chapters: chapters,
          memory_count: memoryCount
        })
      }
    }
    
    if (age || year) {
      // Look for memories from similar time period
      const searchTerm = age ? `Age ${age}` : year.toString()
      const similarMemories = memories?.filter(m => 
        m.approximate_date?.includes(searchTerm) || 
        m.approximate_date?.includes(age?.toString()) ||
        m.approximate_date?.includes(year?.toString())
      ) || []
      
      if (similarMemories.length > 0) {
        const titles = similarMemories.slice(0, 2).map(m => m.title).join(', ')
        return NextResponse.json({
          result: `I see you have memories from around that time: ${titles}. Does your new memory fit with these or is it from a different period?`,
          similar_memories: similarMemories,
          suggested_timeframe: searchTerm
        })
      } else {
        return NextResponse.json({
          result: `I don't see any memories from that time yet. This would be a great addition to your timeline!`,
          similar_memories: [],
          suggested_action: 'create_new_timeframe'
        })
      }
    }
    
    // Default context - include user birth year for age calculations
    const currentYear = new Date().getFullYear()
    const birthYear = userProfile?.birth_year || null
    const currentAge = birthYear ? currentYear - birthYear : null
    const chapterCount = chapters?.length || 0
    
    let contextInfo = ""
    if (birthYear) {
      contextInfo = ` I know you were born in ${birthYear}, so you're currently ${currentAge}. This helps me place memories on your timeline when you mention ages.`
    }
    
    // Add chapter information
    if (chapterCount > 0) {
      const chapterNames = chapters?.slice(0, 3).map(c => c.title).join(', ') || ''
      contextInfo += ` You have ${chapterCount} chapters in your timeline: ${chapterNames}${chapterCount > 3 ? ' and more' : ''}. I can help place new memories in existing chapters or suggest creating new ones.`
    }
    
    const responseData = {
      memory_count: memoryCount,
      user_birth_year: birthYear,
      user_current_age: currentAge,
      chapters: chapters || [],
      chapter_count: chapterCount
    }
    
    console.log('👤 USER CONTEXT RESPONSE:', {
      userId: userId,
      birthYear: birthYear,
      currentAge: currentAge,
      memoryCount: memoryCount,
      chapterCount: chapterCount,
      isFirstMemory: memoryCount === 0
    })
    
    if (memoryCount === 0) {
      return NextResponse.json({
        result: `Hi ${userName}! This looks like your first memory! I'm excited to help you start building your timeline.${contextInfo} What would you like to share?`,
        is_first_memory: true,
        ...responseData
      })
    }
    
    return NextResponse.json({
      result: `Hi ${userName}! You have ${memoryCount} memories in your timeline.${contextInfo} What new memory would you like to add?`,
      ...responseData
    })
    
  } catch (error) {
    console.error('👤 USER CONTEXT ERROR:', error)
    return NextResponse.json(
      {
        error: "Failed to get user context",
        result: "I'm having trouble accessing your timeline information right now. Our technical team has been notified. Let me try to help you anyway - what memory would you like to share?",
        memory_count: 0,
        user_birth_year: null,
        chapters: []
      },
      { status: 500 }
    )
  }
}

// Handle media upload requests
async function uploadMedia(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { media_type, memory_id, description } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('📸 UPLOAD MEDIA REQUEST:', { media_type, memory_id, description, userId })
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('📸 ERROR: No valid user identification from VAPI')
    return NextResponse.json({
      error: "User identification required",
      result: "I need to know who you are to handle media uploads. Please configure user identification in VAPI.",
      success: false
    }, { status: 400 })
  }
  
  try {
    // For now, we'll provide instructions for the user to upload
    // In a full implementation, you'd integrate with your file upload system
    
    const uploadInstructions: { [key: string]: string } = {
      photos: "Great! You can upload photos by visiting your memory timeline and clicking the photo icon on this memory.",
      videos: "Perfect! You can add videos by going to your timeline and selecting this memory to add media.",
      documents: "You can attach documents by visiting this memory in your timeline and using the attachment feature."
    }
    
    const mediaTypeText = media_type || 'photos'
    const instruction = uploadInstructions[mediaTypeText] || uploadInstructions.photos
    
    return NextResponse.json({
      result: `${instruction} I've noted that you want to add ${mediaTypeText} to this memory.`,
      upload_url: `/memories/${memory_id || 'latest'}/upload`, // This would be your upload page
      media_type: mediaTypeText,
      memory_id: memory_id,
      action_required: 'redirect_to_upload'
    })
    
  } catch (error) {
    console.error('📸 UPLOAD MEDIA ERROR:', error)
    return NextResponse.json({
      result: "I've noted that you want to add media to this memory. You can upload it later from your timeline.",
      action_required: 'note_for_later'
    })
  }
}

// Handle call start
async function handleCallStart(body: any) {
  console.log('📞 CALL STARTED:', body.call?.id)
  return NextResponse.json({ success: true })
}

// Handle call end  
async function handleCallEnd(body: any) {
  const { call } = body
  console.log('📞 CALL ENDED:', call?.id, 'Duration:', call?.duration)
  
  // You could save call analytics here
  return NextResponse.json({ success: true })
}

// Create a new chapter (timezone) for organizing memories
async function createChapter(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { title, description, timeframe, start_year, end_year, location } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('📚 CREATING CHAPTER:', { title, description, timeframe, start_year, end_year, location })
  console.log('📚 CREATE CHAPTER - User ID:', userId)
  console.log('📚 CREATE CHAPTER - Parameters:', JSON.stringify(parameters, null, 2))
  
  // Validate required information
  if (!title || title.trim().length === 0) {
    console.error('📚 CREATE CHAPTER - Missing title')
    return NextResponse.json(
      {
        error: "Chapter title is required",
        result: "I need a title for the chapter. What would you like to call it?",
        success: false
      },
      { status: 400 }
    )
  }
  
  // Check if we have enough information to create a meaningful chapter
  if (!start_year && !timeframe && !description) {
    console.error('📚 CREATE CHAPTER - Insufficient information')
    return NextResponse.json(
      {
        error: "Insufficient chapter information",
        result: "I need more details to create this chapter. When did this period of your life happen? What years or age range should I use?",
        success: false
      },
      { status: 400 }
    )
  }
  
  try {
    // We need proper user identification from VAPI - no fallbacks
    if (!userId || userId === '550e8400-e29b-41d4-a716-446655440000' || userId.startsWith('vapi_call_') || userId === 'NOT_FOUND') {
      console.log('📚 ERROR: No valid user identification from VAPI')
      console.log('📚 Available call data:', Object.keys(call || {}))
      console.log('📚 Call object:', JSON.stringify(call, null, 2))
      
      return NextResponse.json({
        error: "User identification required",
        result: "I need to know who you are to access your timeline. Please configure user identification in VAPI or provide your user ID.",
        success: false,
        debug_info: {
          received_user_id: userId,
          call_keys: Object.keys(call || {}),
          needs_configuration: true
        }
      }, { status: 400 })
    }
    
    // Verify the provided user ID exists in our database
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year')
      .eq('id', userId)
      .single()
    
    if (userError || !targetUser) {
      console.log('📚 User not found in database:', { userId, userError })
      return NextResponse.json({
        error: "User not found",
        result: `I can't find a user with ID ${userId} in the database. Please check your VAPI configuration.`,
        success: false
      }, { status: 404 })
    }
    
    console.log('📚 Using verified user:', { id: targetUser.id, email: targetUser.email })
    
    // Personalize the experience
    const userName = targetUser.email?.split('@')[0] || 'there'
    console.log('📚 Personalizing for user:', userName)
    
    // Create chapter using Supabase
    const { data: chapter, error } = await supabaseAdmin
      .from('timezones')
      .insert({
        title: title.trim(),
        description: description || `Chapter covering ${timeframe || `${start_year}${end_year ? ` to ${end_year}` : ''}`}`,
        type: 'PRIVATE',
        start_date: start_year ? new Date(`${start_year}-01-01`).toISOString() : null,
        end_date: end_year ? new Date(`${end_year}-12-31`).toISOString() : null,
        location: location || null,
        creator_id: userId
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add creator as member
    await supabaseAdmin
      .from('timezone_members')
      .insert({
        timezone_id: chapter.id,
        user_id: userId,
        role: 'CREATOR'
      })
    
    console.log('📚 CHAPTER CREATED SUCCESSFULLY:', {
      chapterId: chapter.id,
      title: title,
      userId: userId,
      description: description,
      timeframe: timeframe
    })
    
    return NextResponse.json({
      result: `Perfect! I've created the "${title}" chapter for you. Now I can save memories there.`,
      chapterId: chapter.id,
      chapterTitle: title,
      success: true
    })
    
  } catch (error) {
    console.error('📚 CREATE CHAPTER ERROR:', error)
    return NextResponse.json(
      {
        error: "Failed to create chapter",
        result: "Sorry, I'm having trouble creating chapters right now. Our technical team has been notified. Please try again in a few minutes, or I can save your memory without a chapter for now.",
        success: false
      },
      { status: 500 }
    )
  }
}

// Save user's birth year to their profile
async function saveBirthYear(parameters: any, call: any, authenticatedUserId: string | null = null) {
  const { birth_year } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('🎂 SAVING BIRTH YEAR:', { birth_year, userId })
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('🎂 ERROR: No valid user identification from VAPI')
    return NextResponse.json({
      error: "User identification required",
      result: "I need to know who you are to save your birth year. Please configure user identification in VAPI.",
      success: false
    }, { status: 400 })
  }
  
  if (!birth_year) {
    return NextResponse.json({
      error: "Birth year is required",
      result: "I need your birth year to help organize your memories. What year were you born?",
      success: false
    }, { status: 400 })
  }
  
  try {
    // Update or create user profile with birth year
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        birth_year: parseInt(birth_year),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('🎂 SAVE BIRTH YEAR ERROR:', error)
      throw error
    }
    
    console.log('🎂 BIRTH YEAR SAVED SUCCESSFULLY:', { userId, birth_year })
    
    const currentYear = new Date().getFullYear()
    const currentAge = currentYear - parseInt(birth_year)
    
    return NextResponse.json({
      result: `Perfect! I've saved that you were born in ${birth_year}. That makes you ${currentAge} now. This will help me organize your memories on the timeline. What memory would you like to share?`,
      birth_year: parseInt(birth_year),
      current_age: currentAge,
      success: true
    })
    
  } catch (error) {
    console.error('🎂 SAVE BIRTH YEAR ERROR:', error)
    return NextResponse.json({
      error: "Failed to save birth year",
      result: "I'm having trouble saving your birth year right now. Let me try to help you anyway - what memory would you like to share?",
      success: false
    }, { status: 500 })
  }
}

// Handle transcript updates
async function handleTranscript(body: any) {
  const { transcript, call } = body
  console.log('📝 TRANSCRIPT UPDATE:', transcript?.text?.substring(0, 100))
  
  // You could save transcripts for analysis
  return NextResponse.json({ success: true })
}

// Handle new VAPI tool-calls format
async function handleToolCalls(body: any, authenticatedUserId: string | null = null) {
  console.log('🔧 HANDLING TOOL-CALLS')
  const { message, call } = body
  const toolCalls = message?.toolCallList || message?.toolCalls || []
  
  console.log('🔧 Tool calls count:', toolCalls.length)
  console.log('🔧 Tool calls:', JSON.stringify(toolCalls, null, 2))
  console.log('🔧 Raw message object:', JSON.stringify(message, null, 2))
  console.log('🔧 Message type:', message?.type)
  console.log('🔧 Available message keys:', Object.keys(message || {}))
  
  if (toolCalls.length === 0) {
    console.log('🔧 No tool calls found')
    return NextResponse.json({ success: true })
  }
  
  // Process all tool calls and prepare results
  const results = []
  
  for (const toolCall of toolCalls) {
    const toolCallId = toolCall.id
    // Try multiple possible field names for the function name
    const functionName = toolCall.name || toolCall.function?.name || toolCall.tool?.name || toolCall.functionName
    const functionArgs = toolCall.arguments || toolCall.function?.arguments || toolCall.parameters
    
    console.log('🔧 Processing tool call:', functionName, 'ID:', toolCallId)
    console.log('🔧 Raw tool call object:', JSON.stringify(toolCall, null, 2))
    console.log('🔧 Function arguments:', functionArgs)
    
    try {
      let result
      
      switch (functionName) {
        case 'get-user-context':
          console.log('👤 STARTING get-user-context tool')
          result = await getUserContextForTool(functionArgs, call, authenticatedUserId)
          break
        
        case 'save-memory':
          console.log('💾 STARTING save-memory tool')
          result = await saveMemoryForTool(functionArgs, call, authenticatedUserId)
          break
        
        case 'search-memories':
          console.log('🔍 STARTING search-memories tool')
          result = await searchMemoriesForTool(functionArgs, call, authenticatedUserId)
          break
        
        case 'create-chapter':
          console.log('📚 STARTING create-chapter tool')
          result = await createChapterForTool(functionArgs, call, authenticatedUserId)
          break
        
        case 'upload-media':
          console.log('📸 STARTING upload-media tool')
          result = await uploadMediaForTool(functionArgs, call, authenticatedUserId)
          break
        
        default:
          console.log('❌ UNKNOWN TOOL:', functionName)
          console.log('❌ Available tool call fields:', Object.keys(toolCall))
          if (!functionName) {
            result = `Error: Could not determine tool name from VAPI payload. Available fields: ${Object.keys(toolCall).join(', ')}`
          } else {
            result = `Tool ${functionName} not implemented yet`
          }
      }
      
      results.push({
        toolCallId: toolCallId,
        result: result
      })
      
    } catch (error) {
      console.error('🔧 Error processing tool call:', error)
      results.push({
        toolCallId: toolCallId,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }
  
  console.log('🔧 VAPI Tool Response:', JSON.stringify({ results }, null, 2))
  
  // Log tool call results to webhook monitor
  try {
    const { addWebhookLog } = await import('@/lib/webhook-logger')
    await addWebhookLog({
      type: 'tool_call_response',
      toolCalls: toolCalls.map((tc: any) => ({ 
        id: tc.id, 
        name: tc.name || tc.function?.name || 'unknown',
        arguments: tc.arguments || tc.function?.arguments
      })),
      results: results,
      resultCount: results.length,
      conversationContext: {
        userId: extractUserIdFromCall(call, authenticatedUserId),
        callId: call?.id,
        timestamp: new Date().toISOString()
      }
    })
  } catch (e) {
    // Ignore logging errors
  }
  
  // Return in VAPI expected format
  return NextResponse.json({ results })
}

// Handle message-based webhook format (new VAPI format)
async function handleMessageBasedWebhook(body: any, authenticatedUserId: string | null = null) {
  console.log('🔄 HANDLING MESSAGE-BASED WEBHOOK')
  const { message, call } = body
  const messageType = message?.type
  
  console.log('🔄 Message type:', messageType)
  console.log('🔄 Message content:', JSON.stringify(message, null, 2))
  
  switch (messageType) {
    case 'tool-calls':
      // Handle the new VAPI tool-calls format
      return handleToolCalls(body, authenticatedUserId)
    
    case 'function-call':
      // Legacy format - restructure to match expected format
      const restructuredBody = {
        type: 'function-call',
        functionCall: message.functionCall || message,
        call: call
      }
      return handleFunctionCall(restructuredBody, authenticatedUserId)
    
    case 'transcript':
      return handleTranscript({ transcript: message, call })
    
    case 'call-start':
      return handleCallStart({ call })
    
    case 'call-end':
      return handleCallEnd({ call })
    
    default:
      console.log('🔄 UNHANDLED MESSAGE TYPE:', messageType)
      return NextResponse.json({ success: true })
  }
}

// Tool-specific functions that return just the result string (for VAPI tools format)
async function getUserContextForTool(parameters: any, call: any, authenticatedUserId: string | null = null): Promise<string> {
  const { age, year, context_type } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('👤 GETTING USER CONTEXT (TOOL) for:', userId, { age, year, context_type })
  console.log('👤 FULL CALL OBJECT:', JSON.stringify(call, null, 2))
  console.log('👤 AUTHENTICATED USER ID FROM URL:', authenticatedUserId)
  console.log('👤 🔥 USER ID EXTRACTION RESULTS:')
  console.log('👤 🔥 - From URL param:', authenticatedUserId)
  console.log('👤 🔥 - From call.customer.userId:', call?.customer?.userId)
  console.log('👤 🔥 - From call.assistantOverrides.metadata.userId:', call?.assistantOverrides?.metadata?.userId)
  console.log('👤 🔥 - From call.metadata.userId:', call?.metadata?.userId)
  console.log('👤 🔥 - From call.client.variableValues.userId:', call?.client?.variableValues?.userId)
  console.log('👤 🔥 - From call.variableValues.userId:', call?.variableValues?.userId)
  console.log('👤 🔥 - FINAL EXTRACTED USER ID:', userId)
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('👤 ERROR: No valid user identification from VAPI')
    return "I need to know who you are to access your timeline. Please configure user identification in VAPI."
  }
  
  try {
    // Get user profile data (including birth year)
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, birth_year, created_at')
      .eq('id', userId)
      .single()
    
    if (userError || !userProfile) {
      console.error('👤 USER PROFILE ERROR:', userError)
      return "I can't find your user profile. Please check your VAPI configuration."
    }
    
    console.log('👤 USER PROFILE FOUND:', {
      userId: userId,
      birthYear: userProfile?.birth_year,
      email: userProfile?.email,
      hasProfile: !!userProfile
    })
    
    // Get user's name for personalization
    const userName = userProfile?.email?.split('@')[0] || 'there'
    
    // Get user's chapters (timezones)
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from('timezones')
      .select('id, title, description, start_date, end_date, location')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
    
    if (chaptersError) {
      console.error('👤 CHAPTERS ERROR:', chaptersError)
    } else {
      console.log('👤 CHAPTERS FOUND:', {
        userId: userId,
        chapterCount: chapters?.length || 0,
        chapterTitles: chapters?.map(c => c.title) || []
      })
    }
    
    // Get memories organized by timeframe
    const { data: memories, error } = await supabaseAdmin
      .from('memories')
      .select('id, title, approximate_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    const memoryCount = memories?.length || 0
    
    // Build comprehensive user context
    const currentYear = new Date().getFullYear()
    const currentAge = userProfile.birth_year ? currentYear - userProfile.birth_year : null
    
    let contextResponse = `Hi ${userName}! I now have access to your timeline data:\n\n`
    contextResponse += `👤 **Your Profile:**\n`
    contextResponse += `- Name: ${userName}\n`
    contextResponse += `- Email: ${userProfile.email}\n`
    contextResponse += `- Birth Year: ${userProfile.birth_year}\n`
    contextResponse += `- Current Age: ${currentAge}\n\n`
    
    if (chapters && chapters.length > 0) {
      contextResponse += `📚 **Your Chapters (${chapters.length}):**\n`
      chapters.forEach((chapter, index) => {
        contextResponse += `${index + 1}. ${chapter.title}`
        if (chapter.description) contextResponse += ` - ${chapter.description}`
        contextResponse += `\n`
      })
      contextResponse += `\n`
    } else {
      contextResponse += `📚 **Chapters:** You don't have any chapters yet. I can help you create some!\n\n`
    }
    
    contextResponse += `💭 **Your Memories:** You have ${memoryCount} memories saved\n\n`
    contextResponse += `I'm ready to help you capture new memories, search existing ones, or organize your timeline!`
    
    return contextResponse
    
  } catch (error) {
    console.error('👤 ERROR getting user context:', error)
    return `Sorry, I encountered an error accessing your timeline data: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

// Placeholder functions for other tools
async function saveMemoryForTool(parameters: any, call: any, authenticatedUserId: string | null = null): Promise<string> {
  return "Save memory tool not yet implemented for new VAPI format"
}

async function searchMemoriesForTool(parameters: any, call: any, authenticatedUserId: string | null = null): Promise<string> {
  const { query, timeframe, age, year, chapter_name } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('🔍 SEARCHING MEMORIES (TOOL) for:', userId, { query, timeframe, age, year, chapter_name })
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('🔍 ERROR: No valid user identification from VAPI')
    return "I need to know who you are to search your memories. Please configure user identification in VAPI."
  }
  
  try {
    // Search memories in the database
    const { data: memories, error } = await supabaseAdmin
      .from('memories')
      .select('id, title, content, approximate_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    const memoryCount = memories?.length || 0
    
    if (memoryCount === 0) {
      return "You don't have any memories saved yet. Would you like to tell me about a memory to capture?"
    }
    
    let searchResults = `I found ${memoryCount} memories in your timeline:\n\n`
    
    memories?.forEach((memory, index) => {
      searchResults += `${index + 1}. **${memory.title}**\n`
      if (memory.content) {
        searchResults += `   ${memory.content.substring(0, 100)}...\n`
      }
      if (memory.approximate_date) {
        searchResults += `   Date: ${memory.approximate_date}\n`
      }
      searchResults += `\n`
    })
    
    searchResults += `Would you like me to tell you more about any of these memories, or help you add a new one?`
    
    return searchResults
    
  } catch (error) {
    console.error('🔍 ERROR searching memories:', error)
    return `Sorry, I encountered an error searching your memories: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function createChapterForTool(parameters: any, call: any, authenticatedUserId: string | null = null): Promise<string> {
  const { title, description, timeframe, start_year, end_year } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('📚 CREATING CHAPTER (TOOL) for:', userId, { title, description, timeframe, start_year, end_year })
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('📚 ERROR: No valid user identification from VAPI')
    return "I need to know who you are to create chapters. Please configure user identification in VAPI."
  }
  
  if (!title) {
    return "I need a title for the chapter. What would you like to call it?"
  }
  
  try {
    // Create chapter in the database (using timezones table)
    const { data: chapter, error } = await supabaseAdmin
      .from('timezones')
      .insert({
        creator_id: userId,
        title: title,
        description: description || '',
        start_date: start_year ? `${start_year}-01-01` : null,
        end_date: end_year ? `${end_year}-12-31` : null,
        location: timeframe || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    
    console.log('📚 CHAPTER CREATED SUCCESSFULLY:', { userId, title, chapterId: chapter?.id })
    
    let response = `Perfect! I've created the "${title}" chapter for you.`
    
    if (start_year && end_year) {
      response += ` This covers ${start_year} to ${end_year}.`
    } else if (start_year) {
      response += ` This starts from ${start_year}.`
    }
    
    if (description) {
      response += ` ${description}`
    }
    
    response += ` Now you can organize your memories into this chapter. What memory would you like to add to it?`
    
    return response
    
  } catch (error) {
    console.error('📚 ERROR creating chapter:', error)
    return `Sorry, I encountered an error creating the chapter: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function uploadMediaForTool(parameters: any, call: any, authenticatedUserId: string | null = null): Promise<string> {
  const { media_type, memory_id, description } = parameters
  
  // Use authenticated user ID or extract from call object
  const userId = extractUserIdFromCall(call, authenticatedUserId)
  
  console.log('📸 UPLOAD MEDIA (TOOL) for:', userId, { media_type, memory_id, description })
  
  // Validate user ID
  if (!userId || userId === 'NOT_FOUND') {
    console.log('📸 ERROR: No valid user identification from VAPI')
    return "I need to know who you are to handle media uploads. Please configure user identification in VAPI."
  }
  
  try {
    const mediaTypeText = media_type || 'photos'
    
    const uploadInstructions: { [key: string]: string } = {
      photos: "Great! You can upload photos by visiting your memory timeline and clicking the photo icon on this memory.",
      videos: "Perfect! You can add videos by going to your timeline and selecting this memory to add media.",
      documents: "You can attach documents by visiting this memory in your timeline and using the attachment feature."
    }
    
    const instruction = uploadInstructions[mediaTypeText] || uploadInstructions.photos
    
    let response = `${instruction} I've noted that you want to add ${mediaTypeText} to this memory.`
    
    if (description) {
      response += ` You mentioned: "${description}"`
    }
    
    response += ` Is there anything else about this memory you'd like to capture while we're talking?`
    
    return response
    
  } catch (error) {
    console.error('📸 ERROR handling media upload:', error)
    return `I've noted that you want to add media to this memory. You can upload it later from your timeline. Is there anything else about this memory you'd like to capture?`
  }
}

