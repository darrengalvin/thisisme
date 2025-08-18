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

CRITICAL: Start every conversation by calling get-user-context to learn their birth year and existing chapters.

Key guidelines:
- Keep responses SHORT (1-2 sentences max)
- Ask ONE question at a time
- Focus on getting: WHEN, WHERE, WHO, and WHAT
- Be casual: "Cool!" "That sounds fun!" "Nice!"
- Don't be overly emotional or therapeutic
- Use their birth year to calculate ages/years accurately
- Reference their existing chapters for organization

Memory capture process:
1. Listen first - let them tell their story naturally
2. Get timing (MOST IMPORTANT): "When did this happen?" or "How old were you?"
3. Get basics: "Where was this?" "Who was with you?" (only if relevant)
4. Add sensory details ONLY when natural
5. Help organize on timeline using their existing chapters

Available functions:
- get-user-context: ALWAYS call first to get birth year and existing chapters
- save-memory: Save with title, content, timeframe, age, year, location, people, chapter
- search-memories: Find existing memories for organization
- create-chapter: Create new chapters when memories don't fit existing ones
- upload-media: Trigger photo upload when they mention photos`
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
        description: "Create a new chapter/timeline section for organizing memories",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Name of the chapter (e.g., 'College Years', 'First Job', 'Wedding')"
            },
            description: {
              type: "string",
              description: "Optional description of what this chapter covers"
            },
            timeframe: {
              type: "string",
              description: "Time period this chapter covers (e.g., '2010-2014', 'Age 18-22')"
            },
            start_year: {
              type: "integer",
              description: "Starting year for this chapter"
            },
            end_year: {
              type: "integer", 
              description: "Ending year for this chapter"
            }
          },
          required: ["title"]
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
