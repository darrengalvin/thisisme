import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  let userPrompt = ''
  
  try {
    const body = await request.json()
    const { userPrompt: userPromptFromBody, memoryTitle, memoryDescription, memoryDate } = body
    userPrompt = userPromptFromBody

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User prompt is required' },
        { status: 400 }
      )
    }

    console.log('📝 Enhancing user prompt:', userPrompt)

    // Use GPT-4 to transform simple user description into detailed image prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert at transforming simple memory descriptions into vivid, detailed image generation prompts.

Your job:
1. Take the user's casual description (often vague, informal, lacking detail)
2. Transform it into a RICH, DETAILED photographic prompt for AI image generation
3. Add specific visual details: lighting, mood, composition, atmosphere
4. Include location-specific details if a place is mentioned
5. Describe people, objects, scenery with photographic precision
6. Use warm, nostalgic, emotional language
7. Make it feel like a REAL photograph from that memory

KEY RULES:
- Write in photographic/cinematic language
- Add specific lighting: "golden hour", "soft morning light", "warm evening glow"
- Include atmospheric details: weather, season, time of day
- Describe mood and emotion: "peaceful", "joyful", "nostalgic"
- Add cultural/location context if mentioned
- Use sensory details: textures, colors, materials
- Keep it realistic and authentic (not fantasy)
- Frame it as a single photographic moment
- Aim for 60-100 words

STYLE: Nostalgic photography, warm tones, authentic moment, emotional depth

Example transformations:

User: "we went to aberdeenshire a place called stone haven and we took a walk down the front"
Enhanced: "A scenic coastal walk in Stonehaven, Aberdeenshire, Scotland — a couple strolling along the seafront promenade on a crisp day. The sea glistens under soft northern light, waves gently breaking against stone harbour walls. Traditional stone buildings and quaint seaside cafés line the front, with seagulls soaring above. The air feels calm and fresh, with distant silhouette of Dunnottar Castle on cliffs. Warm tones of evening light reflect on wet cobblestones, creating a peaceful, nostalgic mood."

User: "family christmas dinner 1990s"
Enhanced: "A warm family Christmas dinner in the 1990s — relatives gathered around a festive table laden with traditional holiday food. Soft candlelight and twinkling tree lights cast a golden glow across happy faces. Children in festive jumpers, adults raising glasses in toast. The room decorated with paper chains and tinsel, crackers scattered on the tablecloth. Steam rises from serving dishes, capturing the cozy intimacy of a cherished family moment. Warm, nostalgic photography with authentic 1990s atmosphere."

User: "my first bike"
Enhanced: "A child's first bicycle — a small, gleaming bike with training wheels parked on a sun-dappled driveway. Bright primary colors catch the afternoon light, streamers hanging from handlebars flutter gently. A proud young child stands beside it in casual clothes, hand resting on the seat, beaming with excitement. Suburban garden visible in background with green lawn and flowers. The moment captures pure childhood joy and a milestone memory. Warm, nostalgic photography with soft natural lighting."

Now transform the user's description into a detailed image prompt:`
        },
        {
          role: 'user',
          content: `User's simple description: "${userPrompt}"

${memoryTitle ? `Memory title: "${memoryTitle}"` : ''}
${memoryDescription ? `Memory context: "${memoryDescription}"` : ''}
${memoryDate ? `Time period: ${memoryDate}` : ''}

Transform this into a vivid, detailed photographic prompt (60-100 words).`
        }
      ],
      temperature: 0.8,
      max_tokens: 250
    })

    const enhancedPrompt = completion.choices[0]?.message?.content?.trim()

    if (!enhancedPrompt) {
      throw new Error('No enhanced prompt returned')
    }

    console.log('✨ Enhanced prompt:', enhancedPrompt)

    return NextResponse.json({
      success: true,
      originalPrompt: userPrompt,
      enhancedPrompt,
      message: 'Prompt enhanced successfully'
    })

  } catch (error: any) {
    console.error('Error enhancing prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to enhance prompt',
        // Fallback: return original if enhancement fails
        enhancedPrompt: userPrompt 
      },
      { status: 500 }
    )
  }
}

