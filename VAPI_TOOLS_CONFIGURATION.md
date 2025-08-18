# VAPI Tools Configuration for Memory Assistant

## Overview

This document explains how to configure the **VAPI Tools (Function Calling)** for the Maya memory assistant. These tools allow VAPI to interact with your database and perform memory operations during voice conversations.

## VAPI Tools Setup

In your VAPI dashboard, configure these 4 tools under your assistant's "Functions" section:

---

## Tool 1: `save-memory`

**Description**: Captures and stores a user's memory in the database with timeline organization.

**Function Schema**:
```json
{
  "name": "save-memory",
  "description": "Save a user's memory to their timeline with proper organization and details",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "A brief, descriptive title for the memory (e.g., 'My Wedding Day', 'Learning to Drive')"
      },
      "content": {
        "type": "string",
        "description": "The full memory story as told by the user, including all details they shared"
      },
      "age": {
        "type": "integer",
        "description": "How old the user was when this memory happened (most important for timeline placement)"
      },
      "year": {
        "type": "integer",
        "description": "The specific year this memory happened (if known exactly)"
      },
      "location": {
        "type": "string",
        "description": "Where this memory took place (city, venue, general location)"
      },
      "people": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Names of people who were involved in this memory"
      },
      "sensory_details": {
        "type": "string",
        "description": "Sensory information like smells, sounds, feelings, tastes that the user mentioned"
      },
      "chapter": {
        "type": "string",
        "description": "Life chapter or theme this memory belongs to (e.g., 'Childhood', 'College Years', 'Marriage')"
      }
    },
    "required": ["title", "content"]
  }
}
```

**When to Use**: After gathering enough details about a memory and the user is ready to save it.

**Example Call**:
```json
{
  "title": "Learning to Ride a Bike",
  "content": "I was 7 years old when my dad taught me to ride a bike in the local park. I was scared at first but he held onto the back of the seat. When I realized he had let go and I was riding by myself, I felt so proud!",
  "age": 7,
  "location": "Local park",
  "people": ["Dad"],
  "sensory_details": "Wind in my hair, feeling of the handlebars, Dad's encouraging voice",
  "chapter": "Childhood Adventures"
}
```

---

## Tool 2: `search-memories`

**Description**: Searches existing memories to help organize new ones and avoid duplicates.

**Function Schema**:
```json
{
  "name": "search-memories",
  "description": "Search the user's existing memories to find related ones for better organization",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search term to look for in memory titles and content (e.g., 'wedding', 'school', 'vacation')"
      },
      "timeframe": {
        "type": "string",
        "description": "General time period to search (e.g., 'childhood', 'teenage years', 'college')"
      },
      "age": {
        "type": "integer",
        "description": "Specific age to search memories from"
      },
      "year": {
        "type": "integer",
        "description": "Specific year to search memories from"
      },
      "chapter_name": {
        "type": "string",
        "description": "Name of a life chapter to search within"
      }
    },
    "required": []
  }
}
```

**When to Use**: 
- Before saving a new memory to check for similar ones
- When user mentions something that might connect to existing memories
- To help organize memories into chapters

**Example Call**:
```json
{
  "query": "wedding",
  "year": 2019
}
```

---

## Tool 3: `get-user-context`

**Description**: Gets information about the user's timeline and existing chapters for better organization.

**Function Schema**:
```json
{
  "name": "get-user-context",
  "description": "Get context about the user's timeline and existing memories for better organization",
  "parameters": {
    "type": "object",
    "properties": {
      "age": {
        "type": "integer",
        "description": "Age period to get context for"
      },
      "year": {
        "type": "integer",
        "description": "Year to get context for"
      },
      "context_type": {
        "type": "string",
        "enum": ["timeline_overview", "similar_timeframe", "chapter_suggestions"],
        "description": "Type of context needed: overview of all chapters, similar time periods, or chapter suggestions"
      }
    },
    "required": []
  }
}
```

**When to Use**:
- At the start of conversations to understand their timeline
- When placing memories in timeline context
- To suggest appropriate chapters for new memories

**Example Call**:
```json
{
  "context_type": "timeline_overview"
}
```

---

## Tool 4: `upload-media`

**Description**: Handles requests to upload photos, videos, or documents to memories.

**Function Schema**:
```json
{
  "name": "upload-media",
  "description": "Handle user requests to upload photos, videos, or documents to their memories",
  "parameters": {
    "type": "object",
    "properties": {
      "media_type": {
        "type": "string",
        "enum": ["photos", "videos", "documents"],
        "description": "Type of media the user wants to upload"
      },
      "memory_id": {
        "type": "string",
        "description": "ID of the memory to attach media to (use 'latest' for the most recently saved memory)"
      },
      "description": {
        "type": "string",
        "description": "Description of the media they want to upload"
      }
    },
    "required": ["media_type"]
  }
}
```

**When to Use**: When user mentions wanting to add photos, videos, or documents to a memory.

**Example Call**:
```json
{
  "media_type": "photos",
  "memory_id": "latest",
  "description": "Wedding photos from the ceremony"
}
```

---

## Webhook Configuration

### Webhook URL
Set your VAPI assistant's webhook URL to:
```
https://yourdomain.com/api/vapi/webhook
```

### Webhook Events
Enable these webhook events in VAPI:
- `function-call` - When tools are called
- `call-start` - When conversations begin
- `call-end` - When conversations end

### Authentication
The webhook endpoint handles VAPI signature verification automatically.

---

## Conversation Flow Examples

### Example 1: Saving a Childhood Memory

**User**: "I remember when I was about 8 years old, my mom took me to Disney World for the first time."

**Maya**: "That sounds magical! Tell me more about that Disney World trip."

**User**: "It was amazing. We went on Space Mountain and I was so scared but excited. The whole park smelled like popcorn and I remember getting Mickey Mouse ears."

**Maya**: "What a special memory! When you were 8 - do you remember what year that was?"

**User**: "I think it was around 1995."

**Maya calls**: `save-memory`
```json
{
  "title": "First Trip to Disney World",
  "content": "When I was 8 years old, my mom took me to Disney World for the first time. It was amazing. We went on Space Mountain and I was so scared but excited. The whole park smelled like popcorn and I remember getting Mickey Mouse ears.",
  "age": 8,
  "year": 1995,
  "location": "Disney World",
  "people": ["Mom"],
  "sensory_details": "Smell of popcorn, feeling scared but excited on Space Mountain",
  "chapter": "Childhood Adventures"
}
```

**Maya**: "Perfect! I've saved your Disney World memory to your timeline around age 8 in 1995. It's in your Childhood Adventures chapter. Got any photos from that trip you'd like to add?"

### Example 2: Organizing Related Memories

**User**: "I want to tell you about my college graduation."

**Maya calls**: `search-memories`
```json
{
  "query": "college",
  "timeframe": "college years"
}
```

**Maya**: "I found some memories from your college years: 'Freshman Dorm Life' and 'Spring Break Trip'. Does your graduation memory fit with these or should we create a new chapter?"

**User**: "Yeah, those are all from college. The graduation was in 2010."

**Maya calls**: `save-memory`
```json
{
  "title": "College Graduation",
  "content": "...",
  "year": 2010,
  "chapter": "College Years"
}
```

---

## Best Practices

### Tool Usage Guidelines

1. **Always get timing first** - Use `age` or `year` for proper timeline placement
2. **Search before saving** - Use `search-memories` to check for related memories
3. **Get context when needed** - Use `get-user-context` for timeline organization
4. **Offer media uploads** - Use `upload-media` when appropriate

### Conversation Tips

- **One tool at a time** - Don't call multiple tools simultaneously
- **Confirm before saving** - Always confirm details with user before calling `save-memory`
- **Natural flow** - Let conversation flow naturally, don't force tool usage
- **Short responses** - Keep Maya's responses brief and conversational

### Error Handling

If a tool call fails:
- Don't expose technical errors to the user
- Gracefully continue the conversation
- Ask for clarification if needed
- Retry with different parameters if appropriate

---

## Testing Your Tools

Use the provided test script to verify your webhook functions work correctly:

```bash
node test-vapi-webhooks.js
```

This will test all 4 tools with sample data and show you the responses.

---

## Troubleshooting

### Common Issues

1. **Tool not being called**: Check function schema matches exactly
2. **Webhook errors**: Verify your webhook URL is accessible
3. **Database errors**: Ensure Supabase schema is set up correctly
4. **Authentication issues**: Check VAPI signature verification

### Debug Tips

- Check your webhook logs for detailed error messages
- Test individual functions using the test script
- Verify your database has the test user and sample data
- Ensure your environment variables are set correctly

---

*This configuration enables Maya to naturally capture, organize, and enhance user memories through voice conversation while maintaining a friendly, efficient interaction style.*
