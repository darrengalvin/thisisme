# VAPI Maya Voice Assistant Debug Report
*Generated: August 19, 2025*

## 🎯 **OBJECTIVE**
Get Maya (VAPI voice assistant) to identify users and access their timeline data (name, birth year, chapters, memories) for personalized memory assistance.

## 🔍 **CURRENT STATUS: PARTIALLY WORKING**
- ✅ VAPI calls start successfully 
- ✅ User metadata is passed correctly in `assistantOverrides.metadata`
- ✅ Webhook receives tool calls and can extract user ID
- ✅ Direct webhook tests work perfectly (Maya identifies user)
- ❌ **MAIN ISSUE**: Maya says "setup issue" and can't access user data during live conversations

## 🛠 **WORK COMPLETED**

### 1. **VAPI Integration Setup**
- **Assistant ID**: `8ceaceba-6047-4965-92c5-225d0ebc1c4f`
- **Webhook URL**: `https://thisisme-three.vercel.app/api/vapi/webhook`
- **Tools Configured**: 5 tools (get-user-context, save-memory, search-memories, create-chapter, upload-media)

### 2. **Authentication Issues Resolved**
- **Problem**: `401 Unauthorized` errors when starting VAPI calls
- **Solution**: Fixed Supabase session token verification in `/api/vapi/start-call/route.ts`

### 3. **VAPI SDK Call Format Issues**
- **Problem**: `400 Bad Request` errors with various call configurations
- **Attempts Made**:
  - `vapi.start(assistantId, { customer, metadata })` → 400 error
  - `vapi.start(assistantId)` → Works but no user context
  - `vapi.start(assistantId, { variableValues })` → Works, no 400 error
  - `vapi.start(assistantId, { metadata })` → Current approach (works)

### 4. **User ID Extraction Fix**
- **Problem**: Webhook couldn't extract user ID from VAPI payload
- **Root Cause**: VAPI puts metadata in `call.assistantOverrides.metadata.userId`, not `call.metadata.userId`
- **Solution**: Updated `extractUserIdFromCall()` function to check correct location
- **File**: `app/api/vapi/webhook/route.ts` lines 16-19

### 5. **Webhook Logging Improvements**
- **Problem**: Serverless functions don't persist in-memory logs
- **Solution**: Added Supabase-backed persistent logging
- **Files**: `lib/webhook-logger.ts`, `supabase/migrations/007_webhook_logs_table.sql`

### 6. **Tool Implementation**
All 5 VAPI tools fully implemented:
- `get-user-context`: Fetches user profile, chapters, memories
- `save-memory`: Saves new memories to timeline
- `search-memories`: Searches existing memories
- `create-chapter`: Creates new timeline chapters
- `upload-media`: Handles photo/video uploads

## 🔧 **CURRENT CONFIGURATION**

### Frontend Call (VoiceChatButton.tsx)
```javascript
const callOptions = {
  metadata: {
    userId: "9a9c09ee-8d59-450b-bf43-58ee373621b8",
    userEmail: "dgalvin@yourcaio.co.uk", 
    userName: "dgalvin",
    birthYear: 1981,
    currentAge: 44
  }
}
await vapi.start(assistantId, callOptions)
```

### Webhook Handler (app/api/vapi/webhook/route.ts)
```javascript
// User ID extraction (FIXED)
if (call?.assistantOverrides?.metadata?.userId) {
  return call.assistantOverrides.metadata.userId
}
```

### Maya's Prompt (vapi-natural-memory-prompt.md)
```
**IMMEDIATELY call get-user-context when the conversation starts** to learn:
- Their birth year and current age
- Their existing chapters and timeline structure  
- Their memory count and organization
```

## 🐛 **CURRENT PROBLEM**

### What Maya Says:
- *"I don't have access to your personal information right now"*
- *"It looks like there might be a setup issue"*

### What This Indicates:
1. **Maya IS calling tools** (she knows there's an issue)
2. **Tools are failing** (not returning user data)
3. **User ID extraction might still be failing** in live calls vs test calls

### Evidence:
- **Direct webhook test**: ✅ Works perfectly, returns full user data
- **Live VAPI call**: ❌ Maya reports "setup issue"
- **Webhook logs**: Empty (no tool calls being logged)

## 🔍 **DEBUGGING STEPS TAKEN**

1. **Manual webhook test**: `curl` calls work perfectly
2. **User ID extraction logging**: Added extensive debug logs
3. **Webhook monitor**: Built real-time debugging UI
4. **Tool testing**: Individual tool tests work
5. **VAPI call format**: Tried multiple configurations

## 🎯 **NEXT STEPS NEEDED**

### 1. **Verify VAPI Dashboard Configuration**
- Check if Maya's prompt in VAPI matches local file
- Verify tools are properly connected to assistant
- Confirm webhook URL is correct in VAPI dashboard

### 2. **Debug Live Tool Calls**
- Add conversation logging to see Maya's actual tool calls
- Compare live call payload vs test payload
- Check if user ID is being passed differently in live calls

### 3. **Webhook Payload Analysis**
- Capture actual VAPI webhook payload during live conversation
- Compare with test payload that works
- Identify any differences in data structure

### 4. **Alternative Approaches**
- Try `variableValues` instead of `metadata` 
- Test with hardcoded user ID in webhook URL
- Verify VAPI tool configuration matches backend

## 📊 **TEST RESULTS**

| Test Type | Status | User ID Extracted | Maya Response |
|-----------|--------|-------------------|---------------|
| Direct webhook test | ✅ Pass | ✅ Yes | Full user data |
| Live VAPI call | ❌ Fail | ❓ Unknown | "Setup issue" |
| Tool testing API | ✅ Pass | ✅ Yes | Full user data |
| Webhook reachability | ✅ Pass | N/A | 200 OK |

## 🔗 **KEY FILES**
- `app/api/vapi/webhook/route.ts` - Main webhook handler
- `app/api/vapi/start-call/route.ts` - VAPI call configuration  
- `components/VoiceChatButton.tsx` - Frontend VAPI integration
- `vapi-natural-memory-prompt.md` - Maya's system prompt
- `app/debug-vapi/page.tsx` - Debug interface

## 🚀 **DEPLOYMENT STATUS**
- **Production URL**: https://thisisme-8mqju6gmj-darrengalvins-projects.vercel.app
- **Last Deploy**: August 19, 2025 2:03 PM UTC
- **Status**: ✅ Deployed successfully

---

**SUMMARY**: Maya can receive tool calls and extract user data perfectly in isolation, but during live VAPI conversations, she reports "setup issues" and cannot access user information. The disconnect between test success and live failure suggests a VAPI dashboard configuration issue or payload format difference between test and live calls.
