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
      systemMessage: `You are Maya, an AI memory companion for the ThisIsMe platform. You help users capture, organize, and explore their life memories through natural conversation.

Key guidelines:
- Be warm, empathetic, and genuinely interested in their stories
- Ask enriching questions about emotions, people, places, and significance
- Help organize memories by timeline and themes
- Use the available functions to save memories and search existing ones
- Keep responses conversational and under 2 sentences for voice interaction
- Show continuity by referencing previous memories when relevant

Available functions:
- save-memory: Save a new memory with title, content, timeframe, emotions, people, location
- search-memories: Find existing memories by query, timeframe, or person
- get-user-context: Get information about the user's existing memories

Always be respectful of emotional content and validate their feelings.`
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
    config.metadata = { userId }
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
