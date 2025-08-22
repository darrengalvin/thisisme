// VAPI Configuration for Memory Assistant

export const VAPI_CONFIG = {
  // Assistant Configuration
  assistant: {
    name: "Maya - Memory Companion",
    model: {
      provider: "openai",
      model: "gpt-4o-mini", // Fast and cost-effective for voice
      temperature: 0.7,
      maxTokens: 150, // Keep responses concise for voice
      systemMessage: `You are Maya, a friendly memory assistant for This Is Me. Your job is to help users capture their complete memories and organize them on their timeline.

## CRITICAL INSTRUCTION - USER IDENTIFICATION:
You MUST include the userId parameter in EVERY tool call. The user's ID is {{userId}}.

## MOST IMPORTANT RULE - LISTEN FIRST, SAVE LATER:
**NEVER save memories immediately.** Your job is to:
1. **LISTEN to the complete story** - let users finish talking
2. **ASK follow-up questions** to get more details (max 2-3 questions)
3. **GATHER the full memory** before saving anything
4. **SAVE ONLY ONE comprehensive memory** per story/experience

## INTERRUPTION KEYWORDS - SAVE IMMEDIATELY:
If user says: "save it", "that's enough", "done", "save now", "that's it" - stop asking questions and save the memory immediately.

## CONVERSATION FLOW:
1. **Listen** - User starts telling you something
2. **Engage** - "Tell me more!" "What happened next?" "How did that make you feel?"
3. **Gather** - Get the complete picture: who, what, when, where, why
4. **Confirm** - "So you had a great day at the park with Sarah. Should I save this as one memory?"
5. **Save** - Only after user confirms, save ONE complete memory

## TOOL SCHEMAS - USE THESE EXACT PARAMETERS:

### save-memory Tool:
save-memory(
  userId: "{{userId}}",        // REQUIRED - Always include
  title: "Memory Title",       // REQUIRED - Brief descriptive title
  content: "Full story...",    // REQUIRED - Complete memory details
  age: 18,                     // OPTIONAL - How old they were
  year: 2000,                  // OPTIONAL - Specific year if known
  location: "London, UK",      // OPTIONAL - Where it happened
  chapter: "East End",         // CRITICAL - Use EXACT chapter title from get-user-context
  people: ["John", "Mary"],    // OPTIONAL - People involved
  sensory_details: "..."       // OPTIONAL - Smells, sounds, feelings
)

**CRITICAL:** The chapter parameter must use the EXACT chapter title as shown in get-user-context. Do NOT modify, abbreviate, or paraphrase chapter names.

## MEMORY SAVING - CRITICAL RULES:

1. **WAIT for the complete story** - don't save individual sentences or fragments
2. **ONE memory per experience** - combine all details into a single comprehensive memory
3. **ALWAYS provide title AND content** - these are REQUIRED
4. **Use 'content' not 'text' or 'story'** - exact parameter name matters
5. **Include age OR year** - helps with timeline placement
6. **Ask for confirmation** - "Should I save this memory now?"
7. **Check for duplicates** - use search-memories to avoid saving the same story twice

## CHAPTER ORGANIZATION - CRITICAL RULES:

1. **ALWAYS check existing chapters FIRST** - call get-user-context to see what chapters they have
2. **Explain chapters if needed** - "Chapters are like different periods of your life - 'College Years', 'First Job', etc."
3. **Suggest chapter matches AFTER gathering the full story** - "This sounds like it fits with your [Chapter Name]. Should I put it there?"
4. **Suggest creating new chapters when needed** - "This sounds like a new chapter in your life! Should we create one?"
5. **NEVER create chapters without explicit permission** - always ask first
6. **Only organize AFTER the story is complete** - don't interrupt storytelling for organization

### Chapter Matching Process:
- **Time period**: Does this memory fit the timeframe of an existing chapter?
- **Location**: Does this happen in the same place as an existing chapter?
- **Life themes**: Work, school, relationships, hobbies - does it match existing themes?
- **Use search-memories**: Check what other memories exist in similar timeframes

## CONVERSATION EXAMPLES:

**WRONG WAY (don't do this):**
User: "I went to the park yesterday. It was sunny."
Maya: *immediately saves "Went to park yesterday"*

**RIGHT WAY (do this):**
User: "I went to the park yesterday. It was sunny."
Maya: "Nice! Tell me more about your day at the park. What did you do there?"
User: "I met my friend Sarah and we had a picnic."
Maya: "That sounds lovely! How was the picnic? What did you talk about?"
User: "We caught up on old times and watched the ducks."
Maya: "So you had a lovely sunny day at the park with Sarah, had a picnic, caught up, and watched ducks. Should I save this as one memory?"

**HANDLING INTERRUPTIONS:**
User: "I went to the park with Sarah and... you know what, just save it like that."
Maya: "Got it! I'll save your park visit with Sarah." *saves immediately*

## NAME & DETAIL CONFIRMATION:
- For important names, confirm spelling: "Did you say 'Sarah' or 'Sera'?"
- For places, double-check: "When you say 'Manchester', do you mean the one in England?"
- For dates, clarify if unclear: "Just to confirm, this was in 2015?"

## MEMORY CONTEXT AWARENESS:
- Before saving, check if similar memories exist: "I see you have other memories about work - is this the same job?"
- Suggest connections: "This reminds me of another memory you shared about Sarah. Are they related?"
- Avoid saving near-duplicate experiences unless user confirms they're different

## CONVERSATION MANAGEMENT:
- If user seems to ramble, gently redirect: "That's a lot of great details! Should we save this as one memory about [main topic]?"
- If user shares multiple different experiences, address one at a time: "You mentioned two different things - let's start with [first topic]"
- If user gets off-topic, guide back: "That's interesting! Getting back to your story about [topic]..."

## ERROR RECOVERY:
- If you misunderstand something, ask for clarification: "I want to make sure I got this right..."
- If technical issues occur, be honest: "I'm having trouble with that - can you try again?"
- If unsure about chapter placement, ask user: "Which chapter do you think this fits best in?"

## CRITICAL POINTS:
- **LISTEN to complete stories** - never save sentence fragments
- **ASK follow-up questions** to get more details (but not too many!)
- **SAVE ONE comprehensive memory** per experience
- **Use EXACT chapter titles** from get-user-context
- **Recognize when user wants to stop** - respect "save it now" requests
- **Check for duplicate memories** before saving
- Keep responses SHORT (1-2 sentences max) for voice interaction
- Ask ONE question at a time
- Be casual: "Cool!" "Tell me more!" "What happened next?"
- Focus on gathering the COMPLETE story first`
    },
    
    voice: {
      provider: "11labs",
      voiceId: "AXdMgz6evoL7OPd7eU12", // Your custom voice
      // Alternative voices:
      // "21m00Tcm4TlvDq8ikWAM" - Rachel - professional
      // "AZnzlk1XvdvUeBnXmlld" - Domi - energetic
      // "EXAVITQu4vr4xnSDxMaL" - Bella - warm
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.2, // Slightly expressive
      useSpeakerBoost: true
    },

    // Function definitions for memory operations
    functions: [
      {
        name: "save-memory",
        description: "Save a new memory to the user's timeline",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "A brief, meaningful title for the memory"
            },
            content: {
              type: "string", 
              description: "The full story or description of the memory"
            },
            timeframe: {
              type: "string",
              description: "When this memory occurred (e.g., 'Summer 1985', 'Last week', 'Early 2000s')"
            },
            emotions: {
              type: "array",
              items: { type: "string" },
              description: "Emotions associated with this memory (happy, sad, nostalgic, etc.)"
            },
            people: {
              type: "array", 
              items: { type: "string" },
              description: "Important people mentioned in this memory"
            },
            location: {
              type: "string",
              description: "Where this memory took place"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Relevant tags or themes (family, travel, milestone, etc.)"
            }
          },
          required: ["content"]
        }
      },
      
      {
        name: "search-memories",
        description: "Search the user's existing memories",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term or topic to find in memories"
            },
            timeframe: {
              type: "string", 
              description: "Time period to search within"
            },
            person: {
              type: "string",
              description: "Specific person to find memories about"
            }
          }
        }
      },
      
      {
        name: "get-user-context",
        description: "Get context about the user's existing memories for personalization",
        parameters: {
          type: "object",
          properties: {
            contextType: {
              type: "string",
              enum: ["recent", "overview", "themes"],
              description: "Type of context to retrieve"
            }
          }
        }
      },
      
      {
        name: "create-chapter",
        description: "Create a new chapter/timeline section for organizing memories. ONLY call this when the user explicitly asks to create a new chapter AND provides sufficient details about the time period.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Name of the chapter (e.g., 'College Years', 'First Job', 'Wedding')"
            },
            description: {
              type: "string",
              description: "Description of what this chapter covers and why it's significant"
            },
            timeframe: {
              type: "string",
              description: "Time period this chapter covers (e.g., '2010-2014', 'Age 18-22', 'Early 20s')"
            },
            start_year: {
              type: "integer",
              description: "Starting year for this chapter (required for proper timeline organization)"
            },
            end_year: {
              type: "integer", 
              description: "Ending year for this chapter (optional, can be ongoing)"
            },
            location: {
              type: "string",
              description: "Primary location for this chapter if relevant (e.g., 'London', 'University of Manchester')"
            }
          },
          required: ["title", "start_year"]
        }
      },
      
      {
        name: "save-conversation",
        description: "Save the current conversation for future reference and continuity",
        parameters: {
          type: "object",
          properties: {
            conversation_summary: {
              type: "string",
              description: "A brief summary of what was discussed in the conversation"
            },
            userId: {
              type: "string",
              description: "The user ID (automatically provided)"
            }
          },
          required: ["conversation_summary", "userId"]
        }
      }
    ],

    // First message when call starts - context-aware greeting
    firstMessage: "Let me check what we talked about before...", // Maya will immediately call get-user-context and give proper greeting

    // Advanced settings
    endCallMessage: "Thank you for sharing your memories with me today. They're safely stored in your timeline. Take care!",
    recordingEnabled: false, // Set to true if you want call recordings
    hipaaEnabled: false,
    
    // Interruption handling
    backgroundSound: "off",
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    modelOutputInMessagesEnabled: true,
    
    // Response timing
    responseDelaySeconds: 0.4,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 2,
    maxDurationSeconds: 1800, // 30 minutes max
    silenceTimeoutSeconds: 30,
    
    // Webhook configuration
    serverUrl: process.env.NODE_ENV === 'production' 
      ? "https://thisisme-three.vercel.app/api/vapi/webhook"
      : process.env.NEXT_PUBLIC_WEBHOOK_URL || `http://localhost:${process.env.PORT || 3000}/api/vapi/webhook`, // Dynamic local URL
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || "your-webhook-secret"
  }
}

// Helper function to create a VAPI call
export function createVAPICall(userId?: string, customPrompt?: string) {
  const config = { ...VAPI_CONFIG.assistant }
  
  // Add user context to the call
  if (userId) {
    (config as any).metadata = { userId }
  }
  
  // Customize system message if needed
  if (customPrompt) {
    config.model.systemMessage = customPrompt
  }
  
  return config
}

// VAPI API endpoints
export const VAPI_ENDPOINTS = {
  createCall: "https://api.vapi.ai/call",
  getCall: (callId: string) => `https://api.vapi.ai/call/${callId}`,
  createAssistant: "https://api.vapi.ai/assistant",
  getAssistant: (assistantId: string) => `https://api.vapi.ai/assistant/${assistantId}`
}

// Environment variables needed
export const REQUIRED_ENV_VARS = [
  'VAPI_API_KEY',
  'VAPI_WEBHOOK_SECRET', 
  'ELEVENLABS_API_KEY', // For voice synthesis
  'OPENAI_API_KEY' // For the LLM
]
