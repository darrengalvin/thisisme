# Enhanced VAPI Tools Configuration

## Overview

These additional tools will transform Maya from a basic memory recorder into an intelligent memory companion that proactively helps users discover, organize, and engage with their life story.

---

## 🔍 Memory Enhancement Tools

### Tool: `analyze-memory-gaps`

**Description**: Identifies periods in the user's timeline with few or no memories to encourage exploration.

**Function Schema**:
```json
{
  "name": "analyze-memory-gaps",
  "description": "Identify periods in the user's timeline with few or no memories and suggest exploration",
  "parameters": {
    "type": "object",
    "properties": {
      "time_period": {
        "type": "string",
        "enum": ["childhood", "teenage", "young_adult", "adult", "all"],
        "description": "Specific time period to analyze for gaps"
      },
      "gap_threshold": {
        "type": "integer",
        "description": "Minimum number of years to consider a gap (default: 2)",
        "default": 2
      }
    },
    "required": []
  }
}
```

**When to Use**: 
- During onboarding to understand timeline completeness
- When user seems to have finished sharing recent memories
- Periodically to encourage exploration of forgotten periods

**Example Response**: "I notice you don't have many memories from ages 16-18. That's usually an exciting time with high school, first jobs, or relationships. Want to explore those years?"

---

### Tool: `suggest-memory-prompts`

**Description**: Generate personalized conversation starters based on existing memories and patterns.

**Function Schema**:
```json
{
  "name": "suggest-memory-prompts",
  "description": "Generate personalized memory prompts based on user's existing memories and interests",
  "parameters": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["family", "travel", "career", "relationships", "hobbies", "milestones", "random"],
        "description": "Theme for memory prompts"
      },
      "time_period": {
        "type": "string",
        "description": "Specific time period to focus prompts on (e.g., 'childhood', '2010s')"
      },
      "prompt_count": {
        "type": "integer",
        "description": "Number of prompts to generate (1-5)",
        "default": 3
      }
    },
    "required": []
  }
}
```

**When to Use**:
- When user says "I don't know what to share"
- After saving a memory to suggest related ones
- To help users explore specific themes or time periods

**Example Response**: "Based on your travel memories, here are some prompts: 'Tell me about a time you got lost while traveling' or 'What's the most unusual food you tried abroad?'"

---

### Tool: `connect-related-memories`

**Description**: Find connections between memories and suggest exploration of related stories.

**Function Schema**:
```json
{
  "name": "connect-related-memories",
  "description": "Find and suggest connections between memories based on people, places, or themes",
  "parameters": {
    "type": "object",
    "properties": {
      "memory_id": {
        "type": "string",
        "description": "ID of the memory to find connections for (use 'latest' for most recent)"
      },
      "connection_type": {
        "type": "string",
        "enum": ["people", "places", "themes", "time_period", "all"],
        "description": "Type of connections to find"
      },
      "max_results": {
        "type": "integer",
        "description": "Maximum number of connected memories to return",
        "default": 5
      }
    },
    "required": []
  }
}
```

**When to Use**:
- After saving a new memory
- When user mentions a person or place from previous memories
- To help users see patterns in their life story

**Example Response**: "I found 4 other memories with your friend Sarah - your college graduation, that camping trip, and two birthday parties. Want to hear about any of those?"

---

## 🎯 Organization & Discovery Tools

### Tool: `suggest-chapter-organization`

**Description**: Analyze memories and suggest better chapter organization or new chapter ideas.

**Function Schema**:
```json
{
  "name": "suggest-chapter-organization",
  "description": "Analyze memories and suggest improved chapter organization",
  "parameters": {
    "type": "object",
    "properties": {
      "analysis_type": {
        "type": "string",
        "enum": ["chronological", "thematic", "geographical", "relationship_based"],
        "description": "Type of organization analysis to perform"
      },
      "include_suggestions": {
        "type": "boolean",
        "description": "Whether to include specific reorganization suggestions",
        "default": true
      }
    },
    "required": []
  }
}
```

**When to Use**:
- When user has many unorganized memories
- After adding several memories that don't fit existing chapters
- During periodic timeline reviews

**Example Response**: "I notice you have 8 work-related memories across different chapters. Would you like to create a 'Career Journey' chapter to organize them better?"

---

### Tool: `memory-statistics`

**Description**: Provide insights and statistics about the user's memory collection.

**Function Schema**:
```json
{
  "name": "memory-statistics",
  "description": "Generate statistics and insights about the user's memory collection",
  "parameters": {
    "type": "object",
    "properties": {
      "stat_type": {
        "type": "string",
        "enum": ["overview", "timeline_distribution", "people_frequency", "location_analysis", "theme_breakdown"],
        "description": "Type of statistics to generate"
      },
      "time_range": {
        "type": "string",
        "description": "Time range for analysis (e.g., 'last_year', 'childhood', 'all_time')"
      }
    },
    "required": []
  }
}
```

**When to Use**:
- During milestone conversations (anniversaries, birthdays)
- When user asks about their memory collection
- For gamification and engagement

**Example Response**: "You've captured 73 memories spanning 28 years! Your most active period was your 20s with 24 memories. Family appears in 45% of your memories."

---

## 🎨 Interactive & Engagement Tools

### Tool: `create-memory-story`

**Description**: Generate narrative stories from collections of related memories.

**Function Schema**:
```json
{
  "name": "create-memory-story",
  "description": "Create a narrative story from a collection of related memories",
  "parameters": {
    "type": "object",
    "properties": {
      "story_theme": {
        "type": "string",
        "description": "Theme or focus for the story (e.g., 'college years', 'family traditions', 'career journey')"
      },
      "story_length": {
        "type": "string",
        "enum": ["short", "medium", "long"],
        "description": "Desired length of the generated story"
      },
      "include_memories": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Specific memory IDs to include in the story"
      },
      "narrative_style": {
        "type": "string",
        "enum": ["chronological", "thematic", "emotional_journey"],
        "description": "Style of narrative to create"
      }
    },
    "required": ["story_theme"]
  }
}
```

**When to Use**:
- When user wants to share their story with others
- For special occasions or milestones
- To help users see the bigger picture of their life

**Example Response**: "Here's the story of your college years: 'It all started in September 2010 when you nervously walked into your freshman dorm...'"

---

### Tool: `set-memory-reminders`

**Description**: Set reminders for users to capture memories about upcoming or recurring events.

**Function Schema**:
```json
{
  "name": "set-memory-reminders",
  "description": "Set reminders to capture memories about upcoming or recurring events",
  "parameters": {
    "type": "object",
    "properties": {
      "event_name": {
        "type": "string",
        "description": "Name of the event to set reminder for"
      },
      "event_date": {
        "type": "string",
        "description": "Date of the event (YYYY-MM-DD format)"
      },
      "reminder_type": {
        "type": "string",
        "enum": ["before_event", "after_event", "recurring"],
        "description": "When to send the reminder"
      },
      "reminder_message": {
        "type": "string",
        "description": "Custom message for the reminder"
      }
    },
    "required": ["event_name", "event_date", "reminder_type"]
  }
}
```

**When to Use**:
- When user mentions upcoming important events
- For recurring events like birthdays or anniversaries
- To encourage proactive memory capture

**Example Response**: "I've set a reminder to check in with you after your family reunion next month to capture those memories!"

---

## 🔧 Utility & Maintenance Tools

### Tool: `edit-memory`

**Description**: Allow users to update, correct, or enhance existing memories.

**Function Schema**:
```json
{
  "name": "edit-memory",
  "description": "Update or correct details in an existing memory",
  "parameters": {
    "type": "object",
    "properties": {
      "memory_id": {
        "type": "string",
        "description": "ID of the memory to edit"
      },
      "field_to_edit": {
        "type": "string",
        "enum": ["title", "content", "year", "location", "people", "chapter", "all"],
        "description": "Which field(s) to update"
      },
      "new_value": {
        "type": "string",
        "description": "New value for the field being edited"
      },
      "edit_reason": {
        "type": "string",
        "description": "Reason for the edit (correction, addition, clarification)"
      }
    },
    "required": ["memory_id", "field_to_edit", "new_value"]
  }
}
```

**When to Use**:
- When user corrects information in a memory
- To add additional details to existing memories
- For ongoing curation and accuracy

**Example Response**: "I've updated that memory - the vacation was in 2019, not 2018. Is there anything else you'd like to correct?"

---

### Tool: `find-memory-themes`

**Description**: Identify recurring themes, patterns, or important elements across memories.

**Function Schema**:
```json
{
  "name": "find-memory-themes",
  "description": "Identify recurring themes, people, or patterns across the user's memories",
  "parameters": {
    "type": "object",
    "properties": {
      "analysis_focus": {
        "type": "string",
        "enum": ["people", "places", "emotions", "activities", "life_lessons", "all"],
        "description": "What to analyze for patterns"
      },
      "time_range": {
        "type": "string",
        "description": "Time period to analyze (e.g., 'childhood', 'last_decade', 'all_time')"
      },
      "minimum_frequency": {
        "type": "integer",
        "description": "Minimum number of occurrences to consider a theme",
        "default": 3
      }
    },
    "required": []
  }
}
```

**When to Use**:
- For deep reflection and insight generation
- When user wants to understand patterns in their life
- During milestone conversations or life reviews

**Example Response**: "I've noticed some interesting patterns: 'Adventure' appears in 12 of your memories, and you often mention feeling 'proud' after overcoming challenges."

---

## Implementation Priority

### Phase 1 (High Impact, Easy Implementation):
1. `suggest-memory-prompts` - Immediate engagement boost
2. `connect-related-memories` - Natural conversation flow
3. `edit-memory` - Essential utility function

### Phase 2 (Medium Impact, Moderate Complexity):
4. `analyze-memory-gaps` - Proactive discovery
5. `memory-statistics` - Gamification and insights
6. `set-memory-reminders` - Future memory capture

### Phase 3 (High Impact, Complex Implementation):
7. `create-memory-story` - Advanced narrative generation
8. `suggest-chapter-organization` - Intelligent organization
9. `find-memory-themes` - Deep pattern analysis

---

## Integration Notes

- All tools should include `userId` parameter for proper user context
- Implement rate limiting to prevent overuse of AI-intensive tools
- Consider caching for frequently accessed data (statistics, themes)
- Add fallback responses for when tools return no results
- Ensure tools work well together in conversation flow

This enhanced toolkit will transform Maya from a simple recorder into an intelligent memory companion that actively helps users discover, organize, and engage with their life story.




