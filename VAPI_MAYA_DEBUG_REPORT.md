# VAPI Maya Voice Assistant Debug Report
*Generated: August 19, 2025 - Updated: 4:30 PM UTC*

## 🎯 **OBJECTIVE**
Get Maya (VAPI voice assistant) to identify users and access their timeline data (name, birth year, chapters, memories) for personalized memory assistance.

## 🔍 **CURRENT STATUS: CRITICAL ISSUES REMAIN**
- ✅ VAPI calls start successfully (after multiple format fixes)
- ❌ **CRITICAL**: VAPI is not sending ANY call object to webhook (`"hasCall": false`)
- ❌ **CRITICAL**: User metadata is completely missing from webhook payload
- ❌ **MAIN ISSUE**: Maya cannot access user data - webhook receives empty payload
- 🚨 **NEW DISCOVERY**: Railway logs show VAPI sends no user context at all

## 🛠 **WORK COMPLETED**

### 1. **VAPI Integration Setup**
- **Assistant ID**: `8ceaceba-6047-4965-92c5-225d0ebc1c4f`
- **Webhook URL**: `https://thisisme-production.up.railway.app/vapi/webhook` (MOVED TO RAILWAY)
- **Previous URL**: `https://thisisme-three.vercel.app/api/vapi/webhook` (Vercel - blocked by auth)
- **Tools Configured**: 5 tools (get-user-context, save-memory, search-memories, create-chapter, upload-media)
- **VAPI Documentation**: https://docs.vapi.ai/tools/custom-tools (referenced for payload structure)

### 2. **Authentication Issues Resolved**
- **Problem**: `401 Unauthorized` errors when starting VAPI calls
- **Solution**: Fixed Supabase session token verification in `/api/vapi/start-call/route.ts`

### 3. **VAPI SDK Call Format Issues (5+ Hours of Debugging)**
- **Problem**: `400 Bad Request` errors with various call configurations
- **Attempts Made** (chronological order):
  1. `vapi.start(assistantId, { customer, metadata })` → `400: customer should not exist`
  2. `vapi.start(assistantId, { assistantOverrides: { metadata } })` → `400: assistantOverrides should not exist`
  3. `vapi.start(assistantId, { metadata })` → No 400 error, but no user data forwarded
  4. `vapi.start(assistantId, { variableValues })` → **CURRENT ATTEMPT** (in progress)
  5. `vapi.start(assistantId)` → Works but no user context at all

### 4. **Railway Deployment (Vercel Auth Bypass)**
- **Problem**: Vercel Authentication blocking VAPI webhook calls (requires $150/month Pro plan)
- **Solution**: Deployed standalone webhook service to Railway
- **Files Created**: 
  - `webhook-service/package.json` - Node.js service configuration
  - `webhook-service/server.js` - Express webhook handler
  - `webhook-service/README.md` - Deployment instructions
- **Railway URL**: `https://thisisme-production.up.railway.app/vapi/webhook`
- **Status**: ✅ Deployed successfully, receives webhook calls

### 5. **User ID Extraction Debugging**
- **Problem**: Webhook couldn't extract user ID from VAPI payload
- **Multiple Attempts**:
  - Check `call.metadata.userId`
  - Check `call.assistantOverrides.metadata.userId` 
  - Check `call.customer.userId`
  - Check `call.variableValues.userId`
- **Current Issue**: VAPI sends NO call object at all (`"hasCall": false`)
- **Files**: `webhook-service/server.js`, `app/api/vapi/webhook/route.ts`

### 6. **Comprehensive Debugging Infrastructure**
- **Problem**: Needed real-time visibility into VAPI webhook calls
- **Solutions Implemented**:
  - Railway logs with comprehensive payload logging
  - Supabase-backed persistent webhook logging
  - Debug UI with live webhook monitor (`/debug-vapi`)
  - Direct Railway webhook testing endpoint (`/api/debug/test-railway`)
- **Files**: `lib/webhook-logger.ts`, `supabase/migrations/007_webhook_logs_table.sql`, `app/debug-vapi/page.tsx`

### 7. **Tool Implementation**
All 5 VAPI tools fully implemented:
- `get-user-context`: Fetches user profile, chapters, memories
- `save-memory`: Saves new memories to timeline
- `search-memories`: Searches existing memories
- `create-chapter`: Creates new timeline chapters
- `upload-media`: Handles photo/video uploads

## 🔧 **CURRENT CONFIGURATION**

### Frontend Call (VoiceChatButton.tsx) - LATEST ATTEMPT
```javascript
// Current attempt: variableValues approach
const callOptions = {
  variableValues: {
    userId: "9a9c09ee-8d59-450b-bf43-58ee373621b8",
    userEmail: "dgalvin@yourcaio.co.uk", 
    userName: "dgalvin",
    birthYear: 1981,
    currentAge: 44
  }
}
await vapi.start(assistantId, callOptions)
```

### Railway Webhook Handler (webhook-service/server.js) - CURRENT
```javascript
// User ID extraction - Multiple fallbacks
function extractUserIdFromCall(call, authenticatedUserId = null) {
  // PRIORITY 1: Check variableValues (VAPI's newer approach)
  if (call?.variableValues?.userId) return call.variableValues.userId
  // PRIORITY 2: Check metadata (simple VAPI format)  
  if (call?.metadata?.userId) return call.metadata.userId
  // PRIORITY 3: Check assistantOverrides.metadata
  if (call?.assistantOverrides?.metadata?.userId) return call.assistantOverrides.metadata.userId
  // Additional fallbacks...
}
```

### Maya's Prompt (vapi-natural-memory-prompt.md)
```
**IMMEDIATELY call get-user-context when the conversation starts** to learn:
- Their birth year and current age
- Their existing chapters and timeline structure  
- Their memory count and organization
```

## 🐛 **CURRENT CRITICAL PROBLEM**

### Railway Logs Show (Latest Discovery):
```
🔥 FULL VAPI REQUEST STRUCTURE: {
  "messageType": "tool-calls",
  "hasCall": false,           ← CRITICAL: No call object!
  "callKeys": [],            ← CRITICAL: Empty call data!
  "bodyKeys": ["message"]    ← CRITICAL: Only message, no user context!
}
🔥 CRITICAL DEBUG - Call data: {}  ← CRITICAL: Completely empty!
👤 Extracted user ID: null         ← CRITICAL: No user ID found!
```

### Root Cause Analysis:
1. **VAPI is NOT forwarding user data** from frontend to webhook
2. **Call object is completely missing** (`"hasCall": false`)
3. **Only tool-call message is sent**, no user context whatsoever
4. **Frontend passes data correctly**, but VAPI doesn't forward it

### What Maya Says:
- *"I need to know who you are to access your timeline. Please configure user identification in VAPI."*
- This is the correct error message when no user ID is found

### Evidence:
- **Direct Railway test**: ✅ Works with hardcoded user ID
- **Live VAPI call**: ❌ VAPI sends empty payload to Railway
- **Frontend logs**: ✅ User data is prepared correctly
- **Railway logs**: ❌ Receives empty call object from VAPI

## 🔍 **DEBUGGING STEPS TAKEN (5+ Hours)**

### Phase 1: Authentication & Basic Setup
1. **Fixed 401 Unauthorized errors** - Supabase session verification
2. **Built VAPI integration** - Frontend call configuration
3. **Implemented all 5 tools** - Complete webhook handler

### Phase 2: Call Format Debugging  
4. **Tried 5+ different VAPI call formats** - All documented attempts above
5. **Fixed 400 Bad Request errors** - Multiple SDK format iterations
6. **Added extensive logging** - Frontend and backend debugging

### Phase 3: Infrastructure & Deployment
7. **Deployed to Railway** - Bypassed Vercel authentication blocking
8. **Built debug UI** - Real-time webhook monitoring (`/debug-vapi`)
9. **Created test endpoints** - Direct Railway webhook testing
10. **Added comprehensive logging** - Full VAPI payload inspection

### Phase 4: Payload Analysis (Current)
11. **Discovered VAPI payload structure** - Using Railway logs
12. **Analyzed VAPI documentation** - https://docs.vapi.ai/tools/custom-tools
13. **Testing variableValues approach** - Latest attempt in progress

## 🎯 **NEXT STEPS NEEDED (CRITICAL)**

### 1. **URGENT: Test variableValues Approach**
- **Current Status**: Deployed and ready to test
- **Expected**: VAPI should forward `variableValues` to webhook
- **Test**: Start Maya conversation and check Railway logs for `call.variableValues.userId`

### 2. **VAPI Dashboard Investigation**
- **Check Assistant Configuration**: Verify user data forwarding is enabled
- **Tool Configuration**: Ensure tools are configured to receive call context
- **Webhook URL**: Confirm Railway URL is correctly set in all 5 tools

### 3. **Alternative Solutions if variableValues Fails**
- **Hardcoded User ID**: Pass user ID in webhook URL query parameter
- **Session-based**: Store user context in session, lookup by call ID
- **VAPI Support**: Contact VAPI support with payload structure issue

### 4. **Documentation Compliance Check**
- **Compare with VAPI docs**: Ensure our approach matches https://docs.vapi.ai/tools/custom-tools
- **Payload structure**: Verify we're handling the request format correctly
- **Response format**: Confirm our webhook responses match expected structure

## 📊 **TEST RESULTS (Updated)**

| Test Type | Status | User ID Extracted | Maya Response | Notes |
|-----------|--------|-------------------|---------------|-------|
| Direct Railway webhook test | ✅ Pass | ✅ Yes | Full user data | Hardcoded user ID works |
| Live VAPI call (metadata) | ❌ Fail | ❌ No | "Configure user identification" | Empty call object |
| Live VAPI call (variableValues) | 🔄 Testing | ❓ TBD | ❓ TBD | **CURRENT TEST** |
| Tool testing API | ✅ Pass | ✅ Yes | Full user data | Direct API calls work |
| Railway webhook reachability | ✅ Pass | N/A | 200 OK | Railway deployment successful |
| Vercel webhook (blocked) | ❌ Fail | N/A | 401 Unauthorized | Auth blocking issue |

## 🔗 **KEY FILES**
- `webhook-service/server.js` - **PRIMARY**: Railway webhook handler (current)
- `app/api/vapi/webhook/route.ts` - Vercel webhook handler (blocked by auth)
- `app/api/vapi/start-call/route.ts` - VAPI call configuration  
- `components/VoiceChatButton.tsx` - Frontend VAPI integration (variableValues approach)
- `vapi-natural-memory-prompt.md` - Maya's system prompt
- `app/debug-vapi/page.tsx` - Debug interface with Railway monitoring
- `app/api/debug/test-railway/route.ts` - Direct Railway testing endpoint

## 🚀 **DEPLOYMENT STATUS**
- **Railway Webhook**: https://thisisme-production.up.railway.app/vapi/webhook ✅ Active
- **Vercel Frontend**: https://thisisme-7681f4877-darrengalvins-projects.vercel.app ✅ Active  
- **Last Deploy**: August 19, 2025 4:30 PM UTC
- **Status**: ✅ Both services deployed, testing variableValues approach

---

## **UPDATED SUMMARY (5+ Hours of Debugging)**

**CRITICAL DISCOVERY**: VAPI is not forwarding ANY user context from the frontend to the webhook. Railway logs show `"hasCall": false` and completely empty call objects, despite the frontend correctly preparing user data in multiple formats (`metadata`, `assistantOverrides`, `variableValues`).

**ROOT CAUSE**: Either:
1. **VAPI Dashboard Configuration Issue** - Tools/Assistant not configured to forward call context
2. **VAPI SDK Bug** - User data not being transmitted despite correct format
3. **Documentation Gap** - Missing configuration step for user data forwarding

**CURRENT STATUS**: Testing `variableValues` approach as final attempt. If this fails, the issue is likely in VAPI dashboard configuration or requires VAPI support intervention.

**INFRASTRUCTURE**: Successfully deployed Railway webhook service to bypass Vercel authentication blocking, with comprehensive debugging and monitoring capabilities.
