import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// VAPI Webhook Handler for Memory Assistant
export async function POST(request: NextRequest) {
  try {
    console.log('🎤 VAPI WEBHOOK: Received webhook call')
    
    const body = await request.json()
    const { type, call, message } = body
    
    console.log('🎤 VAPI WEBHOOK: Event type:', type)
    console.log('🎤 VAPI WEBHOOK: Call ID:', call?.id)
    console.log('🎤 VAPI WEBHOOK: Full body:', JSON.stringify(body, null, 2))
    
    switch (type) {
      case 'function-call':
        return handleFunctionCall(body)
      
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
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle function calls from VAPI (when AI wants to save memories, etc.)
async function handleFunctionCall(body: any) {
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
        result = await saveMemory(parameters, call)
        break
      
      case 'search-memories':
        console.log('🔍 STARTING search-memories function')
        result = await searchMemories(parameters, call)
        break
      
      case 'get-user-context':
        console.log('👤 STARTING get-user-context function')
        result = await getUserContext(parameters, call)
        break
      
      case 'upload-media':
        console.log('📸 STARTING upload-media function')
        result = await uploadMedia(parameters, call)
        break
      
      case 'create-chapter':
        console.log('📚 STARTING create-chapter function')
        result = await createChapter(parameters, call)
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
async function saveMemory(parameters: any, call: any) {
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
    
    // Get user ID from call metadata or customer info
    const userId = call.customer?.userId || call.metadata?.userId || '550e8400-e29b-41d4-a716-446655440000'
    
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
async function searchMemories(parameters: any, call: any) {
  const { query, timeframe, age, year, chapter_name } = parameters
  
  console.log('🔍 SEARCHING MEMORIES:', { query, timeframe, age, year, chapter_name })
  
  const userId = call.customer?.userId || call.metadata?.userId || '550e8400-e29b-41d4-a716-446655440000'
  
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
async function getUserContext(parameters: any, call: any) {
  const { age, year, context_type } = parameters
  const userId = call.customer?.userId || call.metadata?.userId || '550e8400-e29b-41d4-a716-446655440000'
  
  console.log('👤 GETTING USER CONTEXT for:', userId, { age, year, context_type })
  console.log('👤 CALL OBJECT:', JSON.stringify(call, null, 2))
  
  // Check if we're using the fallback user ID
  if (userId === '550e8400-e29b-41d4-a716-446655440000') {
    console.warn('⚠️ WARNING: Using fallback user ID - real user ID not found in call object')
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
    } else {
      console.log('👤 USER PROFILE FOUND:', {
        userId: userId,
        birthYear: userProfile?.birth_year,
        email: userProfile?.email,
        hasProfile: !!userProfile
      })
    }
    
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
        result: `This looks like your first memory! I'm excited to help you start building your timeline.${contextInfo} What would you like to share?`,
        is_first_memory: true,
        ...responseData
      })
    }
    
    return NextResponse.json({
      result: `You have ${memoryCount} memories in your timeline.${contextInfo} What new memory would you like to add?`,
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
async function uploadMedia(parameters: any, call: any) {
  const { media_type, memory_id, description } = parameters
  const userId = call.customer?.userId || call.metadata?.userId || '550e8400-e29b-41d4-a716-446655440000'
  
  console.log('📸 UPLOAD MEDIA REQUEST:', { media_type, memory_id, description })
  
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
async function createChapter(parameters: any, call: any) {
  const { title, description, timeframe, start_year, end_year, location } = parameters
  const userId = call.customer?.userId || call.metadata?.userId || '550e8400-e29b-41d4-a716-446655440000'
  
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

// Handle transcript updates
async function handleTranscript(body: any) {
  const { transcript, call } = body
  console.log('📝 TRANSCRIPT UPDATE:', transcript?.text?.substring(0, 100))
  
  // You could save transcripts for analysis
  return NextResponse.json({ success: true })
}
