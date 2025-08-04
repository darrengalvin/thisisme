# Voice Transcription Feature Setup

## Overview
The voice transcription feature uses OpenAI's Whisper API to convert speech to text for memory descriptions. This is a premium feature that requires a valid OpenAI API key.

## Setup Instructions

### 1. OpenAI API Key
You need to add your OpenAI API key to the `.env.local` file:
```
OPENAI_API_KEY=your-openai-api-key-here
```

**Important**: Replace `your-openai-api-key-here` with your actual OpenAI API key from https://platform.openai.com/api-keys

### 2. Database Migration
Run the database migration to add premium subscription fields:
```bash
npx supabase migration up
```

Or manually run the SQL in `supabase/migrations/002_add_premium_fields.sql` in your Supabase dashboard.

### 3. Enable Premium for Testing
To test the voice feature, you can temporarily enable premium for a user:

1. Go to your Supabase dashboard
2. Navigate to the SQL editor
3. Run this query (replace USER_ID with the actual user ID):
```sql
UPDATE profiles 
SET is_premium = true,
    subscription_tier = 'pro',
    subscription_expires_at = NOW() + INTERVAL '30 days'
WHERE id = 'USER_ID';
```

## How It Works

1. **Recording**: The browser's MediaRecorder API captures audio from the user's microphone
2. **Upload**: Audio is sent as a blob to `/api/transcribe`
3. **Transcription**: The API uses OpenAI's Whisper model to convert speech to text
4. **Integration**: Transcribed text is automatically added to the memory description field

## Features

- Real-time audio recording with visual feedback
- Pause/resume recording capability
- Maximum 5-minute recordings (configurable)
- Error handling for microphone permissions
- Automatic audio format detection (WebM, MP4, OGG)
- Progress indicators during transcription

## API Endpoints

- `/api/transcribe` - Handles audio upload and transcription
- `/api/user/premium-status` - Checks if user has premium access

## Components

- `VoiceRecorder.tsx` - Main recording UI component
- `useAudioRecorder.ts` - Custom hook for audio recording logic
- `AddMemoryWizard.tsx` - Integration point in memory creation flow

## Troubleshooting

### "Invalid OpenAI API key"
- Check that your API key in `.env.local` is correct
- Ensure the key has not expired
- Verify you have credits in your OpenAI account

### "Microphone permission denied"
- Browser needs explicit permission to access microphone
- Check browser settings for microphone permissions
- Ensure HTTPS is enabled (required for getUserMedia API)

### "No transcription received"
- Check console for errors
- Verify audio file size is under 25MB
- Ensure audio format is supported (MP3, MP4, WAV, WEBM, OGG)

## Cost Considerations

OpenAI Whisper API pricing (as of 2024):
- $0.006 per minute of audio
- Billed per second, rounded up to nearest second
- 25MB file size limit per request

## Security Notes

- API key should never be exposed to client-side code
- All transcription requests require authentication
- Audio files are temporarily stored and immediately deleted after processing
- Premium status is verified server-side