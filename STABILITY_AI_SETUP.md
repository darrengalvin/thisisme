# Stability AI Image Generation Setup Guide

## Overview

Your application now uses **Stability AI's SD 3.5 Large** - the best quality AI image generation model available in 2025 for creating nostalgic, photorealistic memory photos.

## Why Stability AI SD 3.5 Large?

| Feature | Stability AI SD 3.5 Large | Previous (DALL-E 3 Standard) |
|---------|---------------------------|------------------------------|
| **Quality** | ⭐⭐⭐⭐⭐ Professional grade | ⭐⭐⭐ Standard |
| **Prompt Understanding** | Excellent | Good |
| **People/Faces** | Excellent | Good |
| **Nostalgic Photography** | Outstanding | Decent |
| **Resolution** | 1024x1024+ | 1024x1024 |
| **Cost** | ~$0.065 per image | ~$0.04 per image |

## Setup Instructions

### 1. You Already Have Your API Key! ✅

Your Stability AI API key is ready to use.

### 2. Add API Key to Environment

**For Local Development:**

Create or edit `.env.local` in your project root:

```bash
# AI Image Generation (Stability AI - SD 3.5 Large)
STABILITY_API_KEY=sk-your-actual-key-here
```

**For Production (Vercel):**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `STABILITY_API_KEY`
   - **Value**: `sk-your-actual-key-here`
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application

### 3. Restart Your Development Server

```bash
npm run dev
```

## How It Works

### Model: SD 3.5 Large

Stability AI's **SD 3.5 Large** is their flagship model, released in late 2024. It excels at:

- ✅ **Photorealistic imagery** with exceptional detail
- ✅ **Natural lighting** perfect for nostalgic memories
- ✅ **Accurate faces and people** rendering
- ✅ **Emotional, authentic moments**
- ✅ **Warm, vintage photography aesthetics**
- ✅ **Complex scene understanding**
- ✅ **Superior prompt adherence**

### API Configuration

```javascript
{
  model: 'sd3.5-large',
  mode: 'text-to-image',
  aspect_ratio: '1:1',
  output_format: 'png'
}
```

### Negative Prompts (Quality Filters)

The system automatically filters out:
- ❌ Cartoon/anime styles
- ❌ Illustrations/paintings
- ❌ Low quality/blurry results
- ❌ Distorted/deformed images
- ❌ Watermarks/logos
- ❌ Text/borders

## Testing Your Setup

### Quick Test

1. Log in as a **Premium/AI Pro** user
2. Navigate to **Create Memory** wizard
3. Go to the **Upload Photos** step
4. Click **"Generate AI Image"** button
5. Enter a test prompt:

```
A family Christmas dinner in the 1990s, warm lighting, 
nostalgic photograph, people laughing around the dinner table
```

6. Wait 3-5 seconds for generation
7. You should see a **high-quality, photorealistic** image!

### Quality Check

The image should have:
- ✅ Sharp, detailed rendering
- ✅ Natural, warm lighting
- ✅ Realistic faces and skin tones
- ✅ No artifacts or distortions
- ✅ Nostalgic, emotional atmosphere
- ✅ Professional photography quality

## Advanced Configuration

### Changing Aspect Ratios

To generate images in different sizes, modify in `/app/api/ai/generate-image/route.ts`:

```javascript
formData.append('aspect_ratio', '16:9')  // Landscape
// or
formData.append('aspect_ratio', '9:16')  // Portrait
// or
formData.append('aspect_ratio', '1:1')   // Square (default)
```

### Available Aspect Ratios:
- `1:1` - Square (1024x1024)
- `16:9` - Landscape widescreen
- `9:16` - Portrait mobile
- `4:3` - Standard landscape
- `3:4` - Standard portrait
- `21:9` - Ultra-wide

### Trying Other Stability AI Models

If you want to experiment with different models:

```javascript
// In /app/api/ai/generate-image/route.ts
formData.append('model', 'sd3.5-large')      // Current - Best quality
// or
formData.append('model', 'sd3.5-large-turbo') // Faster, still great quality
// or
formData.append('model', 'sd3.5-medium')      // Balanced quality/speed
```

## Cost & Usage

### Pricing (as of 2025)

- **SD 3.5 Large**: ~$0.065 per 1024x1024 image
- **SD 3.5 Turbo**: ~$0.04 per image (faster)
- **SD 3.5 Medium**: ~$0.035 per image

### Cost Comparison

Generating 1,000 memory images:

| Provider | Cost |
|----------|------|
| Stability AI SD 3.5 Large | **$65** |
| DALL-E 3 HD | $80 |
| DALL-E 3 Standard | $40 |
| Midjourney (subscription) | $30/month |

### Usage Tips

- Generate images only for Premium users (already implemented ✅)
- Cache generated images to avoid regeneration
- Consider adding image editing/retry options
- Monitor usage via Stability AI dashboard

## Troubleshooting

### "STABILITY_API_KEY is not configured"

**Solution:**
1. Check `.env.local` file exists and has the key
2. Restart your dev server: `npm run dev`
3. For production, verify Vercel environment variables
4. Ensure no typos in the variable name

### "Failed to generate image" or 400/500 errors

**Check:**
1. API key is valid and has credits
2. Check Stability AI dashboard for API status
3. Review prompt - ensure it doesn't violate content policy
4. Check API response error message in console logs

### Low Quality Images

**Try:**
1. Use more descriptive prompts
2. Add style keywords: "professional photography", "high detail", "warm lighting"
3. Ensure using `sd3.5-large` model (not turbo/medium)
4. Check negative prompts are working

### Generation Taking Too Long

**Solutions:**
1. Check your internet connection
2. Verify Stability AI API status
3. Consider switching to `sd3.5-large-turbo` for faster generation
4. Implement timeout handling (currently set to 30s)

### Content Policy Violations

If prompts are flagged:
1. Review Stability AI content policy
2. Avoid sensitive content
3. Use more general descriptions
4. Add safety keywords to negative prompts

## API Documentation

**Official Docs:**  
https://platform.stability.ai/docs/api-reference

**Stability AI Dashboard:**  
https://platform.stability.ai/

**Models Overview:**  
https://stability.ai/stable-image

## Support

### Getting Help

1. **Stability AI Support**: support@stability.ai
2. **API Status**: https://status.stability.ai/
3. **Community Discord**: https://discord.gg/stablediffusion
4. **Documentation**: https://platform.stability.ai/docs

### Your Implementation

- **API Route**: `/app/api/ai/generate-image/route.ts`
- **Component**: `/components/AddMemoryWizard.tsx` (lines 345-400)
- **Environment**: `.env.local` (local) or Vercel (production)

---

## Summary

✅ **Upgraded from**: DALL-E 3 Standard  
✅ **Now using**: Stability AI SD 3.5 Large  
✅ **Quality improvement**: Significant upgrade  
✅ **Best for**: Nostalgic, photorealistic memory photos  
✅ **Status**: Ready to use  

**Next Steps:**
1. Add your API key to `.env.local`
2. Restart dev server
3. Test with a memory photo generation
4. Enjoy the best quality AI-generated memory images! 🎨✨

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Model:** Stability AI SD 3.5 Large

