# VAPI Memory Integration Documentation

## Overview

We've integrated **VAPI (Voice AI Platform)** to provide real-time voice interaction for memory capture on the "This Is Me" platform. This replaces our previous WebRTC streaming implementation to achieve better performance and more natural conversation flow.

## Why VAPI?

### Previous Challenges with WebRTC Implementation
- **Latency Issues**: 3-5 second delays from speech to AI response
- **Complex Pipeline**: Multiple steps (audio capture → Whisper → GPT-4o → TTS → playback)
- **Hallucination Problems**: Whisper transcribing silence as "bye-bye" or "thank you"
- **Audio Conflicts**: Multiple TTS responses playing simultaneously
- **Maintenance Overhead**: Complex audio queuing and sentence-level streaming logic

### VAPI Advantages
- **Real-Time Performance**: Sub-second response times with optimized voice pipeline
- **Professional Voice Quality**: Integrated ElevenLabs TTS with consistent voice
- **Robust Speech Recognition**: Better handling of silence and background noise
- **Function Calling**: Direct integration with our memory database via webhooks
- **Simplified Architecture**: VAPI handles the entire voice pipeline

## Architecture

```
User Speech → VAPI Platform → Our Webhooks → Database → VAPI Response → User
```

### Components

1. **VAPI Assistant**: Configured with Maya personality and memory capture prompts
2. **Webhook Functions**: Handle memory operations (save, search, organize)
3. **Database Integration**: Store memories with timeline organization
4. **Frontend Integration**: Simple VAPI SDK integration

## Memory Capture Flow

### 1. Natural Conversation
- User speaks naturally about their memory
- Maya (AI assistant) listens and asks clarifying questions
- Focus on extracting: **WHEN, WHERE, WHO, WHAT**

### 2. Timeline Organization
Maya helps organize memories by:
- **Age/Year**: "When you were 22..." or "In 2019..."
- **Life Chapters**: Grouping related memories (childhood, college, marriage, etc.)
- **Context**: Connecting new memories to existing ones

### 3. Memory Enhancement
- **Sensory Details**: Natural probing for smells, sounds, feelings
- **People**: Who was involved in the memory
- **Location**: Where it happened
- **Emotional Context**: How it felt, what it meant

### 4. Media Integration
- Suggest photo/video uploads for memories
- Webhook triggers upload interface
- Seamless integration with existing media system

## Webhook Functions

### `save-memory`
**Purpose**: Capture and store memories in the database

**Parameters**:
- `title`: Memory title
- `content`: Full memory description
- `age`/`year`: Timeline placement
- `location`: Where it happened
- `people`: Array of people involved
- `sensory_details`: Smells, sounds, feelings
- `chapter`: Life chapter/theme

**Response**: Confirmation with timeline placement

### `search-memories`
**Purpose**: Find existing memories for organization

**Parameters**:
- `query`: Search term
- `timeframe`/`age`/`year`: Time-based search
- `chapter_name`: Chapter-based search

**Response**: Related memories with organization suggestions

### `get-user-context`
**Purpose**: Provide timeline context for better organization

**Parameters**:
- `age`/`year`: Time period of interest
- `context_type`: Type of context needed

**Response**: Existing chapters, similar memories, timeline overview

### `upload-media`
**Purpose**: Handle photo/video upload requests

**Parameters**:
- `media_type`: photos, videos, documents
- `memory_id`: Associated memory
- `description`: Media description

**Response**: Upload instructions and redirect URL

## Maya's Personality

### Core Traits
- **Friendly & Natural**: Like talking to a helpful friend
- **Efficient**: Short responses (1-2 sentences max)
- **Focused**: One question at a time
- **Memory-Oriented**: Always working toward capturing the story

### Conversation Style
- **Casual Language**: "Cool!" "That sounds fun!" "Nice!"
- **Not Clinical**: Avoid therapeutic or overly emotional language
- **Direct Questions**: "When did this happen?" "Who was with you?"
- **Natural Flow**: Let users tell their story, then ask for details

### Memory Capture Process
1. **Listen First**: Let them share naturally
2. **Get Timing**: Most important - when did it happen?
3. **Get Basics**: Where, who (only if relevant)
4. **Add Details**: Sensory information when natural
5. **Organize**: Suggest timeline placement
6. **Save**: Confirm and continue

## Technical Implementation

### Frontend Integration
```javascript
import { useVapi } from '@vapi-ai/web'

const { start, stop, isSessionActive } = useVapi({
  apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY,
  assistant: assistantConfig
})
```

### Webhook Endpoint
- **URL**: `/api/vapi/webhook`
- **Method**: POST
- **Authentication**: VAPI signature verification
- **Response Format**: JSON with `result` field

### Database Schema
Uses existing Supabase `memories` table with:
- Timeline organization (`approximate_date`)
- Rich content (`text_content`)
- User association (`user_id`)
- Media relationships

## Benefits for Users

### Improved Experience
- **Faster Interaction**: Real-time conversation flow
- **Natural Feel**: Like talking to a friend, not a machine
- **Better Organization**: AI helps place memories in timeline context
- **Rich Capture**: Encourages sensory details and emotional context

### Enhanced Memory Quality
- **Complete Stories**: Guided questions ensure full capture
- **Timeline Accuracy**: Focus on when memories happened
- **Contextual Connections**: Links to related memories and chapters
- **Media Integration**: Easy photo/video attachment

## Future Enhancements

### Planned Features
- **Smart Chapter Creation**: AI suggests new life chapters
- **Memory Relationships**: Automatic linking of related memories
- **Emotional Tagging**: Mood and feeling categorization
- **Voice Cloning**: Personal voice synthesis for playback
- **Multi-Language**: Support for different languages

### Analytics & Insights
- **Memory Patterns**: Identify important life themes
- **Timeline Gaps**: Suggest periods to explore
- **Relationship Mapping**: Visualize important people
- **Life Milestones**: Highlight significant events

## Getting Started

1. **Configure VAPI Assistant** with Maya personality
2. **Set up Webhooks** pointing to your API endpoints
3. **Test Functions** using the provided test script
4. **Integrate Frontend** with VAPI SDK
5. **Launch** and start capturing memories!

---

*This integration transforms memory capture from a manual process into a natural conversation, making it easier and more enjoyable for users to build their personal timelines.*
