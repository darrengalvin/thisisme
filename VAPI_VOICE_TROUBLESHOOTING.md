# 🎤 VAPI Custom Voice Troubleshooting

## Issue: Custom ElevenLabs Voice Not Working with VAPI

Your custom voice ID: `AXdMgz6evoL7OPd7eU12`

## 🔍 Common Causes & Solutions

### 1. **Voice Sharing Settings** (Most Common)
**Problem**: Custom voices need to be shared publicly or with VAPI
**Solution**: 
- Go to ElevenLabs Voice Library
- Find your custom voice
- Click "Share" or make it "Public"
- Or add VAPI's ElevenLabs account to your voice sharing permissions

### 2. **API Key Permissions**
**Problem**: Your ElevenLabs API key doesn't have access to custom voices
**Solution**:
- Check your ElevenLabs API key has access to your custom voices
- Try using the voice directly with ElevenLabs API first to verify access

### 3. **Voice ID Format**
**Problem**: Voice ID might be incorrect or malformed
**Solution**:
- Verify the exact voice ID from ElevenLabs dashboard
- Make sure there are no extra spaces or characters

### 4. **VAPI Configuration Issue**
**Problem**: VAPI might not be passing the voice config correctly
**Solution**:
- Try setting the voice in VAPI dashboard instead of via API
- Check VAPI logs for voice-related errors

## 🧪 Testing Steps

### Step 1: Test Voice Directly with ElevenLabs
```bash
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/AXdMgz6evoL7OPd7eU12 \
  -H "Accept: audio/mpeg" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY" \
  -d '{
    "text": "Hello, this is a test of my custom voice.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.8
    }
  }' \
  --output test_voice.mp3
```

### Step 2: Check Voice Availability
```bash
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```
Look for your voice ID in the response.

### Step 3: Test with VAPI Dashboard
1. Go to VAPI Dashboard
2. Create a test assistant
3. Set voice provider to "11labs"
4. Set voice ID to `AXdMgz6evoL7OPd7eU12`
5. Test the assistant

## 🔧 Alternative Solutions

### Option 1: Use Voice Name Instead of ID
Some VAPI configurations work better with voice names:
```typescript
voice: {
  provider: "11labs",
  voiceName: "Your Custom Voice Name", // Instead of voiceId
  stability: 0.5,
  similarityBoost: 0.8
}
```

### Option 2: Fallback Voice Configuration
```typescript
voice: {
  provider: "11labs",
  voiceId: "AXdMgz6evoL7OPd7eU12", // Your custom voice
  fallbackVoiceId: "EXAVITQu4vr4xnSDxMaL", // Bella as fallback
  stability: 0.5,
  similarityBoost: 0.8
}
```

### Option 3: Clone Voice to VAPI Account
1. Share your custom voice with VAPI's ElevenLabs account
2. Or create the voice directly in the ElevenLabs account linked to VAPI

## 🐛 Debug Information to Check

### In Browser Console:
Look for these error messages:
```
- "Voice not found"
- "Unauthorized voice access"
- "ElevenLabs API error"
- "Voice synthesis failed"
```

### In VAPI Dashboard:
- Check call logs for voice-related errors
- Look at assistant configuration
- Verify ElevenLabs integration status

### In ElevenLabs Dashboard:
- Confirm voice exists and is accessible
- Check API key permissions
- Verify voice sharing settings

## 🚀 Quick Fix Attempts

### 1. Try with Voice Settings Reset
```typescript
voice: {
  provider: "11labs",
  voiceId: "AXdMgz6evoL7OPd7eU12",
  // Remove custom settings temporarily
  stability: 0.75,    // Default
  similarityBoost: 0.75, // Default
  style: 0.0,         // Default
  useSpeakerBoost: false // Default
}
```

### 2. Test with Known Working Voice First
```typescript
voice: {
  provider: "11labs",
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - known to work
  stability: 0.5,
  similarityBoost: 0.8
}
```

### 3. Check VAPI Integration Status
- Verify your VAPI account has ElevenLabs properly connected
- Check if there are any billing/quota issues

## 📞 Getting Help

### VAPI Support:
- Discord: https://discord.gg/vapi
- Email: support@vapi.ai
- Include your voice ID and error messages

### ElevenLabs Support:
- Check voice sharing permissions
- Verify API key access to custom voices
- Test voice synthesis directly

## 🎯 Most Likely Solution

Based on common issues, try this first:

1. **Make your voice public** in ElevenLabs dashboard
2. **Test the voice ID** directly with ElevenLabs API
3. **Use a known working voice** to verify VAPI is working
4. **Check VAPI logs** for specific error messages

Let me know what you find and I can help debug further! 🔍
