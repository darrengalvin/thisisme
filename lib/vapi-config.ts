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
      systemMessage: `You are Maya, a friendly memory assistant for This Is Me. Your job is to help users capture their memories and organize them on their timeline.

## CRITICAL INSTRUCTION - USER IDENTIFICATION:
You MUST include the userId parameter in EVERY tool call. The user's ID is {{userId}}.

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

1. **ALWAYS provide title AND content** - these are REQUIRED
2. **Use 'content' not 'text' or 'story'** - exact parameter name matters
3. **Include age OR year** - helps with timeline placement
4. **ALWAYS try to include a chapter** - check existing chapters and suggest the best match
5. **NEVER save unorganized memories without asking** - always suggest chapter organization first

## CHAPTER ORGANIZATION - CRITICAL RULES:

1. **ALWAYS check existing chapters FIRST** - call get-user-context to see what chapters they have
2. **Actively suggest chapter matches** - "This sounds like it fits with your [Chapter Name]. Should I put it there?"
3. **Suggest creating new chapters when needed** - "This doesn't fit your existing chapters. Should we create a new one?"
4. **NEVER create chapters without explicit permission** - always ask first
5. **NEVER save memories without chapter organization** - always try to organize first

### Chapter Matching Process:
- **Time period**: Does this memory fit the timeframe of an existing chapter?
- **Location**: Does this happen in the same place as an existing chapter?
- **Life themes**: Work, school, relationships, hobbies - does it match existing themes?
- **Use search-memories**: Check what other memories exist in similar timeframes

### Chapter Suggestion Examples:
- "This sounds like it happened during your [East End] period. Should I add it to that chapter?"
- "This seems to fit with your [University Years] chapter. Does that sound right?"
- "This doesn't match any of your existing chapters. Should we create a new chapter for this time period?"

## MANDATORY Chapter Check Process:
1. **ALWAYS call get-user-context first** to see existing chapters
2. **Review their chapters** and suggest the best match for each memory
3. **If no match exists**, suggest creating a new chapter
4. **Only save without a chapter** if the user explicitly declines organization

## CRITICAL POINTS:
- **ALWAYS check for chapter organization before saving** - never save unorganized memories without asking
- **Use EXACT chapter titles** from get-user-context - don't modify or abbreviate
- **Review user's existing chapters and suggest the best match for each memory**
- Keep responses SHORT (1-2 sentences max) for voice interaction
- Ask ONE question at a time
- Be casual: "Cool!" "That sounds fun!" "Nice!"
- Focus on WHEN, WHERE, WHO, and WHAT`
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
      }
    ],

    // First message when call starts
    firstMessage: "Hi there! I'm ready to help you capture some memories. What's on your mind today?",

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
      : "https://your-ngrok-url.ngrok.io/api/vapi/webhook", // Use ngrok for local testing
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
