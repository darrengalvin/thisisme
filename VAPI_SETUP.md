# 🎤 VAPI Memory Assistant Setup Guide

## Overview

This guide will help you integrate VAPI (Voice AI Platform) with your memory platform for real-time voice conversations with Maya, your AI memory companion.

## 🚀 Quick Setup

### Step 1: Get VAPI API Key
1. Go to [VAPI Dashboard](https://dashboard.vapi.ai)
2. Sign up/login and get your API key
3. Note: VAPI has a free tier for testing

### Step 2: Environment Variables
Add these to your `.env.local` and Vercel environment:

```env
# VAPI Configuration
NEXT_PUBLIC_VAPI_API_KEY=your_vapi_api_key_here
VAPI_WEBHOOK_SECRET=your_webhook_secret_here

# Voice Provider (ElevenLabs)
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# LLM Provider (OpenAI)
OPENAI_API_KEY=your_openai_key_here
```

### Step 3: Install VAPI SDK
```bash
npm install @vapi-ai/web
```

### Step 4: Test the Integration
1. Visit: `http://localhost:3000/vapi-test`
2. Click "Start Memory Session"
3. Start talking to Maya!

## 🎯 What's Included

### Files Created:
- `app/api/vapi/webhook/route.ts` - Webhook handler for VAPI events
- `lib/vapi-config.ts` - VAPI configuration and settings
- `app/vapi-test/page.tsx` - Test page for voice interactions
- `vapi-memory-assistant-prompt.md` - Optimized prompt for Maya

### Key Features:
- **Real-time voice conversation** with Maya
- **Memory capture** through natural speech
- **Webhook integration** for saving memories to database
- **ElevenLabs voice synthesis** for high-quality responses
- **GPT-4o-mini** for fast, cost-effective conversations

## 🎵 Voice Configuration

### Current Voice: Elizabeth - Professional British Narrator
- **Voice ID**: `AXdMgz6evoL7OPd7eU12`
- **Personality**: Kind, friendly, warm, encouraging
- **Perfect for**: Memory conversations, narration, teaching

### Alternative Voices:
```typescript
// Professional
voiceId: "21m00Tcm4TlvDq8ikWAM" // Rachel

// Energetic  
voiceId: "AZnzlk1XvdvUeBnXmlld" // Domi

// Current (Your Custom Voice)
voiceId: "AXdMgz6evoL7OPd7eU12" // Elizabeth
```

## 🔧 Configuration Options

### Performance Settings:
```typescript
responseDelaySeconds: 0.3,        // Quick response
llmRequestDelaySeconds: 0.1,      // Fast LLM calls
numWordsToInterruptAssistant: 2,  // Natural interruption
maxDurationSeconds: 1800,         // 30 min max call
silenceTimeoutSeconds: 30,        // Auto-end after silence
```

### Quality Settings:
```typescript
backchannelingEnabled: true,           // "mm-hmm" responses
backgroundDenoisingEnabled: true,      // Clean audio
backgroundSound: "off",                // No background noise
```

## 🎤 How Maya Works

### Conversation Flow:
1. **Greeting**: Maya introduces herself warmly
2. **Memory Capture**: User shares a memory naturally
3. **Enrichment**: Maya asks follow-up questions:
   - "What did that feel like?"
   - "Who else was there?"
   - "When did this happen?"
   - "What made it special?"
4. **Organization**: Maya helps categorize and timeline the memory
5. **Continuation**: Maya encourages more sharing

### Memory Functions:
- `save-memory`: Saves memories to your database
- `search-memories`: Finds existing memories
- `get-user-context`: Personalizes based on user history

## 🔗 Webhook Integration

### Webhook URL:
- **Production**: `https://thisisme-three.vercel.app/api/vapi/webhook`
- **Development**: Use ngrok for local testing

### Webhook Events:
- `function-call`: When Maya wants to save/search memories
- `call-start`: Call begins
- `call-end`: Call ends with analytics
- `transcript`: Real-time transcript updates

## 🧪 Testing

### Local Development:
1. Start your dev server: `npm run dev`
2. Use ngrok for webhook testing: `ngrok http 3000`
3. Update webhook URL in VAPI config
4. Visit `/vapi-test` to test

### Production Testing:
1. Deploy to Vercel
2. Visit `https://your-domain.vercel.app/vapi-test`
3. Test full voice pipeline

## 💡 Usage Examples

### Memory Capture:
```
User: "I want to tell you about my wedding day"
Maya: "I'd love to hear about your wedding! Tell me what made that day special for you."
User: "It was in June 2019, and it rained but we didn't care..."
Maya: "That sounds beautiful! What do you remember most vividly about that day?"
```

### Memory Search:
```
User: "Can you find memories about my grandmother?"
Maya: "I found 3 memories about your grandmother: 'Baking cookies together' from childhood, 'Her 90th birthday' from 2018, and 'Sunday dinners' from the 1990s. Which one would you like to talk about?"
```

## 🚀 Performance Benefits vs Current System

### VAPI Advantages:
- **Real-time**: No chunking delays, instant response
- **Professional quality**: Enterprise-grade voice processing
- **Reliable**: Built for production voice applications
- **Webhooks**: Easy integration with your platform
- **Cost-effective**: Pay per minute, not per API call

### Current System Issues Solved:
- ❌ 2-3 second delays → ✅ <500ms response time
- ❌ Audio chunking problems → ✅ Seamless real-time audio
- ❌ Inconsistent transcription → ✅ Professional-grade STT
- ❌ Complex pipeline → ✅ Simple webhook integration

## 📊 Cost Estimation

### VAPI Pricing (approximate):
- **Voice calls**: ~$0.05-0.10 per minute
- **ElevenLabs TTS**: ~$0.30 per 1K characters
- **OpenAI GPT-4o-mini**: ~$0.15 per 1K tokens

### Typical 10-minute memory session:
- VAPI: ~$0.50-1.00
- ElevenLabs: ~$0.50-1.00  
- OpenAI: ~$0.10-0.20
- **Total**: ~$1.10-2.20 per session

## 🔒 Security & Privacy

### Data Handling:
- Calls can be recorded (disabled by default)
- Transcripts available via webhook
- User data stays in your database
- VAPI processes audio, doesn't store memories

### Privacy Settings:
```typescript
recordingEnabled: false,     // No call recording
hipaaEnabled: false,         // Enable for healthcare
serverUrlSecret: "secret",   // Webhook security
```

## 🛠 Customization

### Modify Maya's Personality:
Edit the `systemMessage` in `lib/vapi-config.ts`

### Add New Functions:
Add to the `functions` array in VAPI config and handle in webhook

### Change Voice:
Update `voiceId` in the voice configuration

### Adjust Timing:
Modify `responseDelaySeconds` and related timing settings

## 🐛 Troubleshooting

### Common Issues:

1. **"Failed to initialize VAPI"**
   - Check API key in environment variables
   - Ensure VAPI SDK is installed

2. **"Webhook not receiving calls"**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Use ngrok for local testing

3. **"Voice quality issues"**
   - Check ElevenLabs API key
   - Try different voice IDs
   - Adjust stability/similarity settings

4. **"Slow responses"**
   - Reduce `responseDelaySeconds`
   - Use GPT-4o-mini instead of GPT-4
   - Check network latency

### Debug Mode:
Enable console logging to see VAPI events:
```javascript
vapi.on('message', console.log)
vapi.on('error', console.error)
```

## 🎯 Next Steps

1. **Test basic functionality** with the test page
2. **Customize Maya's personality** for your users
3. **Add memory search** functionality to webhook
4. **Integrate with your auth system** for user identification
5. **Add analytics** to track usage and improve experience
6. **Deploy to production** and gather user feedback

## 📞 Support

- **VAPI Docs**: https://docs.vapi.ai
- **ElevenLabs Docs**: https://docs.elevenlabs.io
- **OpenAI Docs**: https://platform.openai.com/docs

Ready to give your users a voice-powered memory experience! 🎤✨
