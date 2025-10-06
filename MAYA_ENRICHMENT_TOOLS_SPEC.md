# Maya Memory Enrichment - New VAPI Tools Specification

## Overview

This document specifies new VAPI tools to enable Maya to enrich user memories with contextual information, images, and intelligent suggestions during memory creation.

### Goals
1. Enable Maya to search the internet for historical context
2. Allow Maya to find and suggest images for memories
3. Enable location/place information lookup
4. Provide intelligent memory enrichment suggestions
5. Trigger AI image generation with enriched context

---

## Current Tools (Already Implemented)

Maya currently has these tools working:

1. **save-memory** - Save memories to timeline
2. **create-chapter** - Create life chapters
3. **search-memories** - Search user's existing memories
4. **get-user-context** - Get user's timeline overview

---

## New Tools Required

### Tool 1: `search-web-context`

**Purpose**: Search the internet for historical information, places, events to enrich memories

**Function Schema**:
```json
{
  "name": "search-web-context",
  "description": "Search the internet for historical information about places, events, or context to enrich a memory. Use this when the user mentions a specific place, event, or time period that could benefit from additional context.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "The user's ID (always required)"
      },
      "query": {
        "type": "string",
        "description": "What to search for (e.g., 'Croydon Hospital 1990s', 'Berlin Wall fall', 'Manchester United 1999')"
      },
      "search_type": {
        "type": "string",
        "enum": ["place", "event", "historical_fact", "general"],
        "description": "Type of information being searched for"
      },
      "year_range": {
        "type": "string",
        "description": "Optional year or year range for context (e.g., '1995', '1990-1995')"
      },
      "location": {
        "type": "string",
        "description": "Optional geographic location to narrow search"
      }
    },
    "required": ["userId", "query", "search_type"]
  }
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "results": {
    "summary": "Brief 2-3 sentence summary of findings",
    "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
    "relevant_details": "More detailed information if available",
    "images_found": true,
    "source": "Source attribution"
  }
}
```

**API Endpoint**:
- **Original Spec Route**: `POST /api/vapi/tools/search-web-context`
- **✅ IMPLEMENTED Route**: `POST /api/maya/search-web-context`
- **Full URL**: `https://thisisme-three.vercel.app/api/maya/search-web-context`
- **Implementation**: Use Perplexity API or Brave Search API
- **Rate Limiting**: 10 requests per minute per user
- **Caching**: Cache results for 24 hours based on query hash

**Example Usage**:
```
User: "I was in Croydon Hospital for an ear operation when I was 7"

Maya calls:
search-web-context(
  userId: "abc123",
  query: "Croydon Hospital ear operations pediatric",
  search_type: "place",
  year_range: "1995"
)

Maya responds: "I found that Croydon University Hospital has been serving the area since 1885. They have a well-established ENT department. Would you like me to find an image of the hospital from around that time?"
```

---

### Tool 2: `find-location-details`

**Purpose**: Get specific information about a location including images, historical context, and related details

**Function Schema**:
```json
{
  "name": "find-location-details",
  "description": "Get detailed information about a specific location including historical context, images, and relevant facts. Use when user mentions a specific place.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "The user's ID (always required)"
      },
      "location_name": {
        "type": "string",
        "description": "The name of the location (e.g., 'Croydon Hospital', 'Eiffel Tower', 'Central Park')"
      },
      "location_type": {
        "type": "string",
        "enum": ["hospital", "school", "landmark", "city", "venue", "business", "park", "other"],
        "description": "Type of location"
      },
      "year": {
        "type": "integer",
        "description": "Optional specific year for historical context"
      },
      "include_images": {
        "type": "boolean",
        "description": "Whether to search for images of this location",
        "default": true
      }
    },
    "required": ["userId", "location_name"]
  }
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "location": {
    "name": "Croydon University Hospital",
    "full_name": "Croydon University Hospital",
    "type": "hospital",
    "description": "Brief description of the location",
    "historical_context": "Historical information relevant to the time period",
    "address": "530 London Road, Croydon",
    "coordinates": {"lat": 51.234, "lng": -0.123},
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "description": "Hospital exterior from 1995",
        "year": "1995"
      }
    ],
    "related_facts": ["Fact 1", "Fact 2"]
  }
}
```

**API Endpoint**:
- **Original Spec Route**: `POST /api/vapi/tools/find-location-details`
- **✅ IMPLEMENTED Route**: `POST /api/maya/find-location-details`
- **Full URL**: `https://thisisme-three.vercel.app/api/maya/find-location-details`
- **Implementation**: 
  - Use Google Places API for basic info
  - Use Wikipedia API for historical context
  - Use Unsplash/Pexels API for images
  - Fallback to Brave Search for images
- **Rate Limiting**: 20 requests per minute per user
- **Caching**: Cache results for 7 days based on location + year

---

### Tool 3: `suggest-memory-enrichment`

**Purpose**: Analyze a memory and suggest ways to enrich it with additional context, questions, or information

**Function Schema**:
```json
{
  "name": "suggest-memory-enrichment",
  "description": "Analyze a memory being created and suggest ways to enrich it with additional context, questions to ask the user, or information to gather. Use after user shares initial memory details.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "The user's ID (always required)"
      },
      "memory_title": {
        "type": "string",
        "description": "The title or main topic of the memory"
      },
      "memory_content": {
        "type": "string",
        "description": "The current content/description the user has provided"
      },
      "known_details": {
        "type": "object",
        "properties": {
          "year": {"type": "integer"},
          "age": {"type": "integer"},
          "location": {"type": "string"},
          "people": {"type": "array", "items": {"type": "string"}}
        },
        "description": "Details that are already known about this memory"
      },
      "user_chapters": {
        "type": "array",
        "items": {"type": "string"},
        "description": "List of user's existing chapter titles for context"
      }
    },
    "required": ["userId", "memory_title", "memory_content"]
  }
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "enrichment": {
    "questions_to_ask": [
      "Why were you in Croydon at that time?",
      "How did you feel before the operation?",
      "Do you remember who was with you?"
    ],
    "context_to_search": [
      {
        "query": "Croydon Hospital 1995",
        "reason": "Could provide visual context"
      }
    ],
    "chapter_suggestions": [
      {
        "action": "create_new",
        "title": "Living in Croydon",
        "reason": "This seems like a new chapter in your life"
      },
      {
        "action": "add_to_existing",
        "chapter": "Childhood",
        "reason": "This fits with your existing childhood chapter"
      }
    ],
    "missing_details": ["time of year", "outcome of operation"],
    "image_suggestions": [
      {
        "type": "location",
        "description": "Image of Croydon Hospital exterior"
      },
      {
        "type": "ai_generated",
        "prompt_suggestion": "Hospital room with young boy, anaesthesia mask, 1990s medical equipment, warm lighting"
      }
    ]
  }
}
```

**API Endpoint**:
- **Original Spec Route**: `POST /api/vapi/tools/suggest-memory-enrichment`
- **✅ IMPLEMENTED Route**: `POST /api/maya/suggest-memory-enrichment`
- **Full URL**: `https://thisisme-three.vercel.app/api/maya/suggest-memory-enrichment`
- **Implementation**: 
  - Use GPT-4 to analyze memory and generate suggestions
  - Check against user's existing chapters (from database)
  - Check for similar memories (to avoid duplicates)
  - Generate intelligent follow-up questions
- **Rate Limiting**: 15 requests per minute per user

---

### Tool 4: `trigger-image-generation`

**Purpose**: Trigger AI image generation based on enriched memory context

**Function Schema**:
```json
{
  "name": "trigger-image-generation",
  "description": "Trigger DALL-E image generation for a memory based on user's description and enriched context. Use after gathering enough details about the memory.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "The user's ID (always required)"
      },
      "base_prompt": {
        "type": "string",
        "description": "The user's original description of what they want to see"
      },
      "enriched_context": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "time_period": {"type": "string"},
          "people_description": {"type": "string"},
          "mood": {"type": "string"},
          "key_elements": {"type": "array", "items": {"type": "string"}}
        },
        "description": "Additional context gathered through conversation"
      },
      "style_preferences": {
        "type": "string",
        "enum": ["photographic", "nostalgic", "artistic", "realistic", "vintage"],
        "description": "Style for the generated image",
        "default": "nostalgic"
      },
      "memory_id": {
        "type": "string",
        "description": "Optional memory ID if this is for an existing memory"
      }
    },
    "required": ["userId", "base_prompt"]
  }
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "image": {
    "url": "https://storage.example.com/generated-image.png",
    "enhanced_prompt": "The full prompt used for generation",
    "generation_id": "gen_abc123",
    "estimated_wait": 15
  }
}
```

**API Endpoint**:
- **Original Spec Route**: `POST /api/vapi/tools/trigger-image-generation`
- **✅ ALREADY EXISTS**: `POST /api/ai/generate-image`
- **Full URL**: `https://thisisme-three.vercel.app/api/ai/generate-image`
- **Implementation**: 
  - Use existing DALL-E 3 integration from `/api/ai/generate-image`
  - Enhance the prompt with enriched context
  - Return the generated image URL
  - Store in user's media storage
- **Rate Limiting**: 5 requests per hour per user (expensive operation)
- **Premium Only**: Verify user has AI Pro subscription

---

### Tool 5: `search-similar-memories`

**Purpose**: Search user's existing memories to find similar experiences and avoid duplicates

**Function Schema**:
```json
{
  "name": "search-similar-memories",
  "description": "Search for similar memories the user has already saved to avoid duplicates and find connections. Use before saving a new memory.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "The user's ID (always required)"
      },
      "memory_summary": {
        "type": "string",
        "description": "Brief summary of the memory being created"
      },
      "time_range": {
        "type": "object",
        "properties": {
          "start_year": {"type": "integer"},
          "end_year": {"type": "integer"}
        },
        "description": "Optional time range to narrow search"
      },
      "location": {
        "type": "string",
        "description": "Optional location to find related memories"
      }
    },
    "required": ["userId", "memory_summary"]
  }
}
```

**Expected Response Format**:
```json
{
  "success": true,
  "similar_memories": [
    {
      "id": "mem_123",
      "title": "First Day at School",
      "similarity_score": 0.85,
      "reason": "Same time period and location",
      "date": "1995-09-01"
    }
  ],
  "has_duplicates": false,
  "suggestions": {
    "might_be_related": true,
    "connect_memories": false
  }
}
```

**API Endpoint**:
- **Original Spec Route**: `POST /api/vapi/tools/search-similar-memories`
- **✅ IMPLEMENTED Route**: `POST /api/maya/search-similar-memories`
- **Full URL**: `https://thisisme-three.vercel.app/api/maya/search-similar-memories`
- **Implementation**: 
  - Use vector similarity search on memory embeddings
  - Fallback to keyword matching
  - Check for near-duplicate detection
- **Rate Limiting**: 30 requests per minute per user

---

## Implementation Requirements

### Backend API Routes

All new endpoints should be created under `/api/vapi/tools/`:

```
/api/vapi/tools/
  ├── search-web-context       (POST)
  ├── find-location-details    (POST)
  ├── suggest-memory-enrichment (POST)
  ├── trigger-image-generation (POST)
  └── search-similar-memories  (POST)
```

### Authentication & Security

All endpoints must:
1. Verify VAPI webhook signature
2. Validate userId exists in database
3. Check user's premium status (for premium-only features)
4. Implement rate limiting per specification
5. Sanitize all inputs
6. Log all requests for debugging

### Database Changes Needed

**New Table: `maya_enrichment_logs`**
```sql
CREATE TABLE maya_enrichment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  tool_name TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New Table: `maya_web_search_cache`**
```sql
CREATE TABLE maya_web_search_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_cache_hash ON maya_web_search_cache(query_hash);
CREATE INDEX idx_cache_expires ON maya_web_search_cache(expires_at);
```

### External APIs Required

1. **Perplexity AI** or **Brave Search API**
   - For web context searching
   - Sign up at: https://www.perplexity.ai/api

2. **Google Places API** (already might have)
   - For location details
   - Docs: https://developers.google.com/maps/documentation/places

3. **Wikipedia API** (free)
   - For historical context
   - Docs: https://www.mediawiki.org/wiki/API

4. **Unsplash/Pexels API** (free tier available)
   - For location images
   - Unsplash: https://unsplash.com/developers
   - Pexels: https://www.pexels.com/api/

### Environment Variables Needed

```env
# Search APIs
PERPLEXITY_API_KEY=your_key_here
BRAVE_SEARCH_API_KEY=your_key_here

# Location APIs
GOOGLE_PLACES_API_KEY=your_key_here

# Image APIs
UNSPLASH_ACCESS_KEY=your_key_here
PEXELS_API_KEY=your_key_here

# Caching
REDIS_URL=your_redis_url_here (for caching search results)
```

---

## VAPI Configuration

### How to Add These Tools to VAPI

1. Go to VAPI Dashboard → Your Assistant → Functions
2. For each tool, click "Add Function"
3. Paste the function schema from this document
4. Set the webhook URL to: `https://yourapp.com/api/vapi/webhook`
5. Ensure the webhook handler processes these new tool calls

### Updated Webhook Handler

The webhook handler at `/api/vapi/webhook` needs to handle these new tool types:

```typescript
// Add to existing webhook handler
switch (toolName) {
  case 'search-web-context':
    return await handleWebSearch(parameters);
  
  case 'find-location-details':
    return await handleLocationDetails(parameters);
  
  case 'suggest-memory-enrichment':
    return await handleMemoryEnrichment(parameters);
  
  case 'trigger-image-generation':
    return await handleImageGeneration(parameters);
  
  case 'search-similar-memories':
    return await handleSimilarMemories(parameters);
  
  // ... existing cases
}
```

---

## User Experience Flow

### For Non-Premium Users

When they click "Generate AI Image":

1. Show modal: "Maya can help enrich this memory"
2. Explain what Maya does (search context, ask questions, find images)
3. CTA: "Activate Maya (Pro)" or "Continue Without"
4. If "Continue Without": Use basic image generation
5. If "Activate Maya": Show upgrade flow

### For Premium Users

When they click "Generate AI Image":

1. Open Maya modal with voice/text toggle
2. Maya calls `suggest-memory-enrichment` to analyze the memory
3. Maya asks enriching questions based on suggestions
4. Maya calls `search-web-context` for mentioned places/events
5. Maya calls `find-location-details` if specific locations mentioned
6. Maya calls `search-similar-memories` to check for related memories
7. Maya suggests chapter organization if appropriate
8. Maya calls `trigger-image-generation` with enriched context
9. Generated image is added to the memory automatically

---

## Testing Checklist

- [ ] Each tool has proper error handling
- [ ] Rate limiting works correctly
- [ ] Caching reduces API calls
- [ ] Premium-only features are gated properly
- [ ] VAPI webhook signature verification works
- [ ] All database queries are optimized
- [ ] Response times are < 3 seconds per tool call
- [ ] Fallbacks work when APIs are unavailable
- [ ] Costs are within budget ($X per 1000 enrichments)

---

## Cost Estimates

### Per Memory Enrichment Session (Premium User)

- Web search (Perplexity): $0.005 per search × 2 = $0.01
- Location details (Google Places): $0.017 per request × 1 = $0.017
- GPT-4 enrichment suggestions: $0.03 per call × 1 = $0.03
- Image generation (DALL-E): $0.04 per image × 1 = $0.04

**Total per enriched memory: ~$0.10**

### Monthly Estimates (100 Premium Users, 10 memories/user)

- 1000 memories × $0.10 = $100/month in API costs
- Plus caching saves ~40% = ~$60/month actual cost

---

## Priority Order for Implementation

1. **search-web-context** - Core feature for enrichment
2. **suggest-memory-enrichment** - Makes Maya intelligent
3. **find-location-details** - Adds visual context
4. **trigger-image-generation** - Completes the flow
5. **search-similar-memories** - Nice-to-have, prevents duplicates

---

## Success Metrics

Track these metrics to measure success:

1. **Enrichment Engagement**: % of Pro users who use Maya enrichment
2. **Memory Completeness**: Average number of fields filled per memory (before/after)
3. **Chapter Creation**: Number of chapters created via Maya suggestions
4. **Image Generation**: % of memories with AI-generated images
5. **User Satisfaction**: Survey ratings for Maya enrichment feature
6. **Conversion**: % of free users who upgrade after seeing Maya teaser

---

## Questions to Answer Before Implementation

1. Should Maya enrichment be mandatory for Pro users or optional?
2. How much should we cache vs. make fresh API calls?
3. Should we support multiple languages for web searches?
4. Do we need a "Maya enrichment history" view for users?
5. Should enrichment suggestions be saved even if user declines them?

---

## Next Steps

1. Review this specification with the team
2. Get API keys for external services
3. Create the database tables
4. Implement backend endpoints one by one
5. Test each tool independently before integration
6. Add tools to VAPI dashboard
7. Update webhook handler
8. Test end-to-end flow
9. Deploy to staging
10. Get beta user feedback
11. Deploy to production

---

## Additional "Super Smart" Tools to Consider

These tools would elevate Maya from helpful to truly intelligent and intuitive:

### Tool 6: `manage-person` ⭐ HIGH VALUE

**Purpose**: Add, update, or retrieve information about people in user's network

**Why It's Valuable**: 
- Maya can proactively build user's network as names come up
- Track relationships and connections
- Enable better AI image generation (faces of known people)

**Function Schema**:
```json
{
  "name": "manage-person",
  "description": "Add a person to user's network, update their details, or retrieve information about them. Use when user mentions someone new or wants to update person details.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "action": {
        "type": "string",
        "enum": ["add", "update", "get", "search"],
        "description": "What to do with the person"
      },
      "person_name": {"type": "string"},
      "relationship": {"type": "string"},
      "person_email": {"type": "string"},
      "notes": {"type": "string"},
      "photo_url": {"type": "string"}
    },
    "required": ["userId", "action", "person_name"]
  }
}
```

**Use Case**:
```
User: "I went to the park with Sarah"
Maya: "I don't have Sarah in your network yet. What's your relationship with her?"
User: "She's my best friend from university"
Maya: [calls manage-person(action: "add", person_name: "Sarah", relationship: "Best friend from university")]
Maya: "Great! I've added Sarah. I'll remember her for future memories."
```

**API Endpoint**: `POST /api/maya/manage-person`  
**Status**: ✅ Implemented and ready for VAPI integration  
**Full URL**: `https://thisisme-three.vercel.app/api/maya/manage-person`

---

### Tool 7: `analyze-timeline-gaps` ⭐ HIGH VALUE

**Purpose**: Identify gaps in user's timeline and suggest periods to explore

**Why It's Valuable**: 
- Proactively helps users fill in their story
- Creates natural conversation prompts
- Ensures comprehensive life coverage

**Function Schema**:
```json
{
  "name": "analyze-timeline-gaps",
  "description": "Analyze the user's timeline to find gaps, sparse periods, or missing life stages. Use to suggest what memories to explore next.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "analysis_type": {
        "type": "string",
        "enum": ["temporal_gaps", "chapter_coverage", "life_stages", "all"],
        "description": "What kind of gaps to look for"
      },
      "suggest_prompts": {
        "type": "boolean",
        "description": "Whether to generate conversation prompts for gaps",
        "default": true
      }
    },
    "required": ["userId"]
  }
}
```

**Response Format**:
```json
{
  "gaps": [
    {
      "type": "temporal",
      "period": "2005-2010",
      "severity": "high",
      "prompt": "I notice you haven't shared much about 2005-2010. That would've been your early 20s - what was happening then?"
    }
  ],
  "sparse_chapters": ["University", "First Job"],
  "suggested_topics": ["Moving house", "Travel", "Career changes"]
}
```

**Use Case**:
```
User: "What else should I add?"
Maya: [calls analyze-timeline-gaps]
Maya: "I notice you haven't shared much about your university years. Want to explore that period?"
```

**API Endpoint**: `POST /api/maya/analyze-timeline-gaps`  
**Status**: ⏳ Planned for Phase 3 implementation  

---

### Tool 8: `detect-life-events` ⭐ MEDIUM VALUE

**Purpose**: Recognize significant life events and suggest creating chapters or milestones

**Why It's Valuable**: 
- Automatically organizes life story
- Recognizes patterns humans might miss
- Suggests meaningful chapter boundaries

**Function Schema**:
```json
{
  "name": "detect-life-events",
  "description": "Analyze memories to detect significant life events like moves, job changes, relationships, births, losses. Suggest chapters or milestones.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "recent_memories": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Recent memory IDs to analyze"
      },
      "event_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["move", "job_change", "relationship", "birth", "loss", "graduation", "other"]
        }
      }
    },
    "required": ["userId"]
  }
}
```

**Use Case**:
```
User shares multiple memories about "moving to London", "new flat", "starting at new company"

Maya: [calls detect-life-events]
Maya: "It sounds like you moved to London and started a new chapter! Would you like me to create a 'London Years' chapter for these memories?"
```

---

### Tool 9: `suggest-memory-prompts` ⭐ HIGH VALUE

**Purpose**: Generate intelligent conversation starters based on user's history

**Why It's Valuable**: 
- Keeps engagement high
- Helps users remember forgotten memories
- Creates natural conversation flow

**Function Schema**:
```json
{
  "name": "suggest-memory-prompts",
  "description": "Generate personalized conversation prompts to help user remember and share more memories. Based on their existing memories, gaps, and interests.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "context": {
        "type": "string",
        "enum": ["current_conversation", "timeline_gaps", "specific_topic", "random_exploration"],
        "description": "What context to use for suggestions"
      },
      "topic": {
        "type": "string",
        "description": "Optional specific topic to explore (e.g., 'family', 'travel', 'school')"
      },
      "count": {
        "type": "integer",
        "description": "Number of prompts to generate",
        "default": 3
      }
    },
    "required": ["userId", "context"]
  }
}
```

**Response Format**:
```json
{
  "prompts": [
    {
      "type": "specific",
      "question": "You mentioned your mum Claire - what's your favorite memory with her?",
      "reason": "Related to existing person in network"
    },
    {
      "type": "exploratory",
      "question": "Tell me about your first day at secondary school",
      "reason": "Common life event not yet covered"
    }
  ]
}
```

**Use Case**:
```
User: "I don't know what else to share"
Maya: [calls suggest-memory-prompts(context: "timeline_gaps")]
Maya: "How about this - you mentioned living in Croydon. What was your favorite place to hang out there?"
```

**API Endpoint**: `POST /api/maya/suggest-memory-prompts`  
**Status**: ✅ Implemented and ready for VAPI integration  
**Full URL**: `https://thisisme-three.vercel.app/api/maya/suggest-memory-prompts`

---

### Tool 10: `link-related-memories` ⭐ MEDIUM VALUE

**Purpose**: Find and connect related memories to build narrative threads

**Why It's Valuable**: 
- Creates story continuity
- Shows memory evolution
- Helps users see their life story

**Function Schema**:
```json
{
  "name": "link-related-memories",
  "description": "Find memories related to the current one (same people, places, themes) and suggest connections or narrative threads.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "memory_id": {
        "type": "string",
        "description": "Current memory to find connections for"
      },
      "connection_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["people", "places", "themes", "time_period", "emotions"]
        }
      },
      "suggest_narrative": {
        "type": "boolean",
        "description": "Whether to suggest a narrative thread",
        "default": true
      }
    },
    "required": ["userId", "memory_id"]
  }
}
```

**Use Case**:
```
User saves memory about "First day at new job"

Maya: [calls link-related-memories]
Maya: "This connects to your 'Job Interview' memory from last month. Should I create a 'Career at Company X' collection?"
```

---

### Tool 11: `tag-media` ⭐ HIGH VALUE

**Purpose**: Tag people, places, and events in photos/videos

**Why It's Valuable**: 
- Organizes visual memories
- Enables face recognition for AI images
- Searchable media library

**Function Schema**:
```json
{
  "name": "tag-media",
  "description": "Add tags to photos or videos - people, places, events, emotions. Helps organize and search media.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "media_id": {"type": "string"},
      "tags": {
        "type": "object",
        "properties": {
          "people": {"type": "array", "items": {"type": "string"}},
          "places": {"type": "array", "items": {"type": "string"}},
          "events": {"type": "array", "items": {"type": "string"}},
          "emotions": {"type": "array", "items": {"type": "string"}}
        }
      },
      "auto_detect": {
        "type": "boolean",
        "description": "Use AI to auto-detect tags",
        "default": true
      }
    },
    "required": ["userId", "media_id"]
  }
}
```

---

### Tool 12: `memory-reflection-prompt` ⭐ MEDIUM VALUE

**Purpose**: Ask thought-provoking questions about a memory to deepen it

**Why It's Valuable**: 
- Adds emotional depth
- Captures feelings, not just facts
- Creates more meaningful memories

**Function Schema**:
```json
{
  "name": "memory-reflection-prompt",
  "description": "Generate reflective questions about a memory to add emotional depth and perspective. Ask about feelings, learnings, changes.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "memory_summary": {"type": "string"},
      "reflection_type": {
        "type": "string",
        "enum": ["emotional", "lessons_learned", "how_it_changed_me", "looking_back"],
        "description": "Type of reflection to prompt"
      }
    },
    "required": ["userId", "memory_summary"]
  }
}
```

**Use Case**:
```
User: "I started my first job at Tesco when I was 16"
Maya: [saves basic memory, then calls memory-reflection-prompt]
Maya: "Looking back, how did that first job shape who you are today?"
```

---

### Tool 13: `smart-chapter-suggestion` ⭐ HIGH VALUE

**Purpose**: Intelligently suggest when to create, merge, or split chapters

**Why It's Valuable**: 
- Better organization without user thinking about it
- Recognizes natural life boundaries
- Keeps timeline clean and meaningful

**Function Schema**:
```json
{
  "name": "smart-chapter-suggestion",
  "description": "Analyze user's memories and chapters to suggest creating new chapters, merging similar ones, or splitting broad ones.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "trigger": {
        "type": "string",
        "enum": ["new_memory", "periodic_review", "explicit_request"],
        "description": "What triggered this analysis"
      },
      "recent_memory_id": {"type": "string"}
    },
    "required": ["userId", "trigger"]
  }
}
```

**Response Format**:
```json
{
  "suggestions": [
    {
      "action": "create",
      "title": "University Years",
      "reason": "You have 15 memories about university across multiple chapters",
      "estimated_years": "2010-2014",
      "confidence": "high"
    },
    {
      "action": "merge",
      "chapters": ["Living in London", "Working in London"],
      "into": "London Years",
      "reason": "These chapters overlap significantly in time and theme"
    }
  ]
}
```

**API Endpoint**: `POST /api/maya/smart-chapter-suggestion`  
**Status**: ✅ Implemented and ready for VAPI integration  
**Full URL**: `https://thisisme-three.vercel.app/api/maya/smart-chapter-suggestion`

---

### Tool 14: `anniversary-memory-finder` ⭐ LOW VALUE (Nice-to-have)

**Purpose**: Find memories from today's date in previous years

**Why It's Valuable**: 
- Creates nostalgia moments
- Encourages revisiting old memories
- Natural conversation starter

**Function Schema**:
```json
{
  "name": "anniversary-memory-finder",
  "description": "Find memories that happened on this day in previous years. Great for nostalgia and reflection.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "date": {
        "type": "string",
        "format": "date",
        "description": "The date to check (defaults to today)"
      },
      "year_range": {
        "type": "integer",
        "description": "How many years back to search",
        "default": 10
      }
    },
    "required": ["userId"]
  }
}
```

---

### Tool 15: `collaborative-memory-invite` ⭐ MEDIUM VALUE

**Purpose**: Invite others to contribute to a memory or chapter

**Why It's Valuable**: 
- Builds shared family/friend stories
- Gets multiple perspectives
- Increases engagement

**Function Schema**:
```json
{
  "name": "collaborative-memory-invite",
  "description": "Invite another person to contribute their perspective on a memory or collaborate on a chapter.",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"},
      "memory_id": {"type": "string"},
      "invite_to": {
        "type": "string",
        "description": "Email or phone of person to invite"
      },
      "invitation_message": {
        "type": "string",
        "description": "Personal message to include"
      },
      "permission_level": {
        "type": "string",
        "enum": ["view", "comment", "contribute"],
        "default": "contribute"
      }
    },
    "required": ["userId", "memory_id", "invite_to"]
  }
}
```

**Use Case**:
```
User: "My mum was there too, she'd remember more details"
Maya: "Would you like me to invite her to add her perspective to this memory?"
User: "Yes, her email is claire@email.com"
Maya: [calls collaborative-memory-invite]
Maya: "Done! I've sent Claire an invitation."
```

---

## Recommended Implementation Priority

### Phase 1 (Core Enrichment) - Already Specified:
1. search-web-context
2. suggest-memory-enrichment
3. find-location-details
4. trigger-image-generation
5. search-similar-memories

### Phase 2 (Smart Assistant Features) - Next:
6. **manage-person** ⭐ - Critical for network building
7. **suggest-memory-prompts** ⭐ - Keeps users engaged
8. **smart-chapter-suggestion** ⭐ - Automatic organization

### Phase 3 (Advanced Intelligence):
9. **analyze-timeline-gaps** - Proactive suggestions
10. **detect-life-events** - Pattern recognition
11. **memory-reflection-prompt** - Emotional depth

### Phase 4 (Nice-to-Haves):
12. **link-related-memories** - Narrative building
13. **tag-media** - Media organization
14. **collaborative-memory-invite** - Social features
15. **anniversary-memory-finder** - Nostalgia/engagement

---

## Why These Tools Make Maya "Super Smart"

### 1. **Proactive, Not Reactive**
Tools like `analyze-timeline-gaps` and `suggest-memory-prompts` mean Maya doesn't wait for users to think of what to say - she guides the conversation.

### 2. **Learns and Remembers**
`manage-person` and `detect-life-events` mean Maya builds knowledge about the user over time.

### 3. **Emotionally Intelligent**
`memory-reflection-prompt` adds depth beyond just facts.

### 4. **Self-Organizing**
`smart-chapter-suggestion` and `link-related-memories` mean the timeline organizes itself.

### 5. **Collaborative**
`collaborative-memory-invite` makes it social, not solitary.

### 6. **Context-Aware**
Every tool feeds into making Maya understand the user's life story better.

---

## Additional Infrastructure Needed

### Vector Embeddings Database
For intelligent memory connections and similarity:
- Use Pinecone or Supabase pgvector
- Store embeddings of each memory
- Enable semantic search

### Redis for Session State
Maya needs to remember conversation context:
- What's been discussed
- What questions have been asked
- What suggestions have been made

### Background Jobs
Some analysis should run periodically:
- Daily timeline gap analysis
- Weekly chapter optimization suggestions
- Monthly memory prompt generation

---

---

## Implementation Status Summary

### ✅ Phase 1 & 2 Tools - READY FOR VAPI INTEGRATION

All core tools are implemented and deployed to production:

1. **search-web-context** - `POST /api/maya/search-web-context`
2. **suggest-memory-enrichment** - `POST /api/maya/suggest-memory-enrichment`
3. **find-location-details** - `POST /api/maya/find-location-details`
4. **search-similar-memories** - `POST /api/maya/search-similar-memories`
5. **manage-person** - `POST /api/maya/manage-person`
6. **suggest-memory-prompts** - `POST /api/maya/suggest-memory-prompts`
7. **smart-chapter-suggestion** - `POST /api/maya/smart-chapter-suggestion`
8. **trigger-image-generation** - `POST /api/ai/generate-image` (already existed)

**Production Base URL**: `https://thisisme-three.vercel.app`

### Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer {user_token}
```

The token is obtained from user's session cookies and validated server-side.

### Required Environment Variables

These are already configured in production:

- `OPENAI_API_KEY` - For GPT-4/embeddings
- `TAVILY_API_KEY` - For web search
- `UNSPLASH_ACCESS_KEY` - For location images (optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Database admin access

### Next Steps for VAPI Integration

1. Add these 8 tools to Maya's VAPI assistant configuration
2. Use the full production URLs for each endpoint
3. Configure authentication to pass user's Bearer token
4. Test each tool through VAPI to ensure proper data flow
5. Monitor usage and response times
6. Phase 3 tools (analyze-timeline-gaps, etc.) can be added later

---

**Document Version**: 1.2  
**Created**: 2025-10-06  
**Last Updated**: 2025-10-06  
**Changes**: 
- Added 10 additional "super smart" tools with implementation priorities
- Implemented 7 core API endpoints (Phase 1 & 2)
- Added implementation status and production URLs
- Ready for VAPI agent integration
