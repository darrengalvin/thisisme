# VAPI Tool Configuration for Maya's Conversation Saving

## 🎯 What You Need to Add

Maya now has a **new tool** called `save-conversation` that needs to be configured in your **VAPI dashboard**.

## 🛠️ Tool Configuration

### **Tool Name:** `save-conversation`

### **Tool Description:**
```
Saves the current conversation with a summary for future reference and context continuity
```

### **Tool Parameters Schema:**
```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "The user's unique identifier (required for all tool calls)"
    },
    "conversation_summary": {
      "type": "string",
      "description": "A brief summary of what was discussed in the conversation"
    },
    "messages": {
      "type": "array",
      "description": "Optional array of conversation messages to save",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": ["user", "assistant", "system"]
          },
          "content": {
            "type": "string",
            "description": "The message content"
          }
        }
      }
    }
  },
  "required": ["userId", "conversation_summary"]
}
```

### **Function/Server URL:**
```
Your existing Railway webhook URL (same as other tools)
https://your-webhook-service.railway.app/vapi/webhook
```

## 📝 Step-by-Step VAPI Configuration

### **1. Go to VAPI Dashboard**
- Log into your VAPI account
- Navigate to your Maya assistant configuration

### **2. Add New Tool**
- Find "Tools" or "Functions" section
- Click "Add Tool" or "Add Function"

### **3. Fill in Tool Details**
- **Name:** `save-conversation`
- **Description:** `Saves the current conversation with a summary for future reference and context continuity`
- **Type:** Server/Function Call (not inline)

### **4. Add Parameters Schema**
Copy the JSON schema above into the parameters field

### **5. Set Webhook URL**
Use your existing Railway webhook URL (same as your other tools)

### **6. Required Parameters**
Mark these as required:
- ✅ `userId` 
- ✅ `conversation_summary`

Optional:
- ⚪ `messages`

### **7. Test the Tool**
After adding, test by asking Maya:
*"Hey Maya, can you save our conversation?"*

## 🎯 Expected Behavior

### **Before (Broken):**
```
User: "Can you save our conversation?"
Maya: "I don't have the ability to save conversations..."
```

### **After (Working):**
```
User: "Can you save our conversation?"
Maya: "I'll save our conversation so I can reference it next time!"
*calls save-conversation tool*
Maya: "Great! I've saved our conversation. I'll be able to reference this in future chats!"
```

## 🔧 Verification Steps

### **1. Check Tool is Added**
- Maya should have access to `save-conversation`
- Should appear in available tools list

### **2. Test Tool Call**
```
User: "Save our conversation about testing"
Maya: *calls save-conversation with summary*
Maya: "✅ Great! I've saved our conversation..."
```

### **3. Check Database**
- Go to Supabase → `conversations` table
- Should see new conversation record
- `call_id` will start with `manual-`

### **4. Test Context Retrieval**
- Start new conversation with Maya
- She should reference the saved conversation
- Should say: "I remember we discussed..."

## 🚨 Troubleshooting

### **If tool doesn't appear:**
- Check VAPI dashboard tool configuration
- Verify webhook URL is correct
- Ensure required parameters are marked

### **If tool calls fail:**
- Check Railway logs for errors
- Verify webhook service is running
- Check user ID extraction works

### **If conversations don't save:**
- Check Supabase RLS policies (should be fixed)
- Verify database permissions
- Check Railway logs for errors

## ✅ Success Criteria

**Maya should be able to:**
1. ✅ Save conversations when asked
2. ✅ Reference previous conversations in new chats  
3. ✅ Provide conversation continuity
4. ✅ Remember what you discussed before

**Database should show:**
1. ✅ New records in `conversations` table
2. ✅ Summary messages in `conversation_messages` table
3. ✅ Proper user linking via `user_id`

## 🎯 Final Test

**Complete flow:**
1. Ask Maya: *"Can you save our conversation about conversation saving?"*
2. Maya calls `save-conversation` tool
3. Maya confirms: *"Great! I've saved our conversation..."*
4. Check Supabase - new conversation record appears
5. Start new chat with Maya
6. Maya should reference previous conversation

**This will give Maya the conversation memory she needs!** 🎉
