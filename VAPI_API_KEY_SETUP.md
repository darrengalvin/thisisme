# VAPI API Key Setup

## 🔑 **Quick Setup Guide**

The voice memory widget needs your VAPI API key to work. Here's how to set it up:

### 1. **Get Your VAPI API Key**
- Go to [VAPI Dashboard](https://dashboard.vapi.ai)
- Navigate to **Settings** → **API Keys**
- Copy your **Public API Key** (starts with `pk_`)

### 2. **Add to Environment Variables**

#### **For Local Development:**
Create or update `.env.local` in your project root:
```bash
NEXT_PUBLIC_VAPI_PUBLIC_KEY=pk_your_actual_api_key_here
```

#### **For Vercel Production:**
1. Go to your [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
   - **Value**: `pk_your_actual_api_key_here`
   - **Environments**: Production, Preview, Development

### 3. **Restart Your Application**
- **Local**: Stop and restart `npm run dev`
- **Production**: Redeploy with `vercel --prod`

## 🎯 **Testing the Setup**

1. Open your app and look for the floating voice bubble
2. Click it to start a conversation
3. Check the browser console for initialization messages:
   - ✅ `🎤 VAPI: Initializing with API key: Present`
   - ❌ `🎤 VAPI: No API key found`

## 🚨 **Troubleshooting**

### **401 Authentication Error**
- Double-check your API key is correct
- Make sure you're using the **Public Key** (starts with `pk_`)
- Verify the environment variable name is exactly `NEXT_PUBLIC_VAPI_PUBLIC_KEY`

### **Assistant Not Found**
- Your assistant ID `8ceaceba-6047-4965-92c5-225d0ebc1c4f` should be active in VAPI
- Check your VAPI dashboard to ensure the assistant exists

### **Still Not Working?**
1. Check browser console for detailed error messages
2. Verify your VAPI account has sufficient credits
3. Test with a simple VAPI call outside the app

## 📝 **Current Configuration**

- **Assistant ID**: `8ceaceba-6047-4965-92c5-225d0ebc1c4f`
- **Webhook URL**: `https://thisisme-three.vercel.app/api/vapi/webhook`
- **Voice ID**: `19STyYD15bswVz51nqLf` (Your custom ElevenLabs voice)

Once configured, the voice widget will work seamlessly with your memory system! 🎉
