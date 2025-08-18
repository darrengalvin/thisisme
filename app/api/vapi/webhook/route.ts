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
  
  try {
    switch (name) {
      case 'save-memory':
        return await saveMemory(parameters, call)
      
      case 'search-memories':
        return await searchMemories(parameters, call)
      
      case 'get-user-context':
        return await getUserContext(parameters, call)
      
      case 'upload-media':
        return await uploadMedia(parameters, call)
      
      default:
        return NextResponse.json({
          result: `Function ${name} not implemented yet`
        })
    }
  } catch (error) {
    console.error('🎤 VAPI FUNCTION ERROR:', error)
    return NextResponse.json({
      result: `Error executing ${name}: ${error.message}`
    })
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
  
  try {
    // Calculate approximate date from age or year
    let approximateDate = timeframe
    if (age && !approximateDate) {
      const currentYear = new Date().getFullYear()
      approximateDate = `Age ${age} (around ${currentYear - (currentYear - age) + age})`
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
    
    if (error) throw error
    
    console.log('💾 MEMORY SAVED:', memory.id)
    
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
    return NextResponse.json({
      result: "I had trouble saving that memory. Can you tell me when it happened so I can place it correctly on your timeline?",
      success: false
    })
  }
}

// Search existing memories for organization and context
async function searchMemories(parameters: any, call: any) {
  const { query, timeframe, age, year, chapter_name } = parameters
  
  console.log('🔍 SEARCHING MEMORIES:', { query, timeframe, age, year, chapter_name })
  
  const userId = call.customer?.userId || call.metadata?.userId || 'test-user'
  
  try {
    // Build search conditions
    const searchConditions: any = {
      userId: userId
    }

    // Search by content/title
    if (query) {
      searchConditions.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { textContent: { contains: query, mode: 'insensitive' } }
      ]
    }
    
    // Search by timeframe/age/year
    if (timeframe || age || year) {
      const searchTerm = timeframe || (age ? `Age ${age}` : year?.toString())
      if (searchTerm) {
        searchConditions.approximateDate = {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }
    }

    let query = supabaseAdmin
      .from('memories')
      .select('id, title, text_content, approximate_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Apply search filters
    if (searchConditions.OR) {
      // Search in title or content
      const searchTerm = query || timeframe || (age ? `Age ${age}` : year?.toString())
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,text_content.ilike.%${searchTerm}%`)
      }
    }
    
    if (searchConditions.approximateDate) {
      const searchTerm = timeframe || (age ? `Age ${age}` : year?.toString())
      if (searchTerm) {
        query = query.ilike('approximate_date', `%${searchTerm}%`)
      }
    }

    const { data: memories, error } = await query
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
    const memoryGroups = {}
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
    return NextResponse.json({
      result: "Let me just save this as a new memory. When did this happen?",
      memories: []
    })
  }
}

// Get user context for timeline organization
async function getUserContext(parameters: any, call: any) {
  const { age, year, context_type } = parameters
  const userId = call.customer?.userId || call.metadata?.userId || 'test-user'
  
  console.log('👤 GETTING USER CONTEXT for:', userId, { age, year, context_type })
  
  try {
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
      const timeGroups = {}
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
    
    // Default context
    if (memoryCount === 0) {
      return NextResponse.json({
        result: "This looks like your first memory! I'm excited to help you start building your timeline. What would you like to share?",
        memory_count: 0,
        is_first_memory: true
      })
    }
    
    return NextResponse.json({
      result: `You have ${memoryCount} memories in your timeline. What new memory would you like to add?`,
      memory_count: memoryCount
    })
    
  } catch (error) {
    console.error('👤 USER CONTEXT ERROR:', error)
    return NextResponse.json({
      result: "Ready to capture a new memory! What's on your mind?",
      memory_count: 0
    })
  }
}

// Handle media upload requests
async function uploadMedia(parameters: any, call: any) {
  const { media_type, memory_id, description } = parameters
  const userId = call.customer?.userId || call.metadata?.userId || 'test-user'
  
  console.log('📸 UPLOAD MEDIA REQUEST:', { media_type, memory_id, description })
  
  try {
    // For now, we'll provide instructions for the user to upload
    // In a full implementation, you'd integrate with your file upload system
    
    const uploadInstructions = {
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

// Handle transcript updates
async function handleTranscript(body: any) {
  const { transcript, call } = body
  console.log('📝 TRANSCRIPT UPDATE:', transcript?.text?.substring(0, 100))
  
  // You could save transcripts for analysis
  return NextResponse.json({ success: true })
}
