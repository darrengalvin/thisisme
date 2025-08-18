import { ElevenLabsClient } from 'elevenlabs'

interface VoiceConfig {
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

interface TranscriptionResult {
  text: string
  confidence: number
  language: string
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
}

interface EmotionalAnalysis {
  primary: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral'
  confidence: number
  secondary?: string
  arousal: number // 0-1 scale (calm to excited)
  valence: number // -1 to 1 scale (negative to positive)
}

export class VoiceClient {
  private elevenLabs: ElevenLabsClient
  private defaultVoiceId: string
  private userVoiceProfiles: Map<string, string>

  constructor() {
    if (!process.env.ELEVEN_LABS_API_KEY) {
      throw new Error('ELEVEN_LABS_API_KEY is required')
    }

    this.elevenLabs = new ElevenLabsClient({
      apiKey: process.env.ELEVEN_LABS_API_KEY
    })

    // Default voice for memory assistant - Rachel is a great conversational voice
    this.defaultVoiceId = process.env.ELEVEN_LABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel voice
    this.userVoiceProfiles = new Map()
  }

  /**
   * Convert text to speech for memory responses
   */
  async textToSpeech(
    text: string, 
    config?: VoiceConfig
  ): Promise<Buffer> {
    try {
      const audioStream = await this.elevenLabs.generate({
        voice: config?.voiceId || this.defaultVoiceId,
        text: text,
        model_id: config?.modelId || 'eleven_monolingual_v1'
      })

      // Convert ReadableStream to Buffer
      const chunks: Uint8Array[] = []
      const reader = (audioStream as any).getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      console.error('Text-to-speech error:', error)
      throw new Error('Failed to generate speech')
    }
  }

  /**
   * Stream text to speech for real-time responses
   */
  async streamTextToSpeech(
    text: string,
    onChunk: (chunk: Uint8Array) => void,
    config?: VoiceConfig
  ): Promise<void> {
    try {
      const audioStream = await this.elevenLabs.textToSpeech.convertAsStream(
        config?.voiceId || this.defaultVoiceId,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: config?.stability || 0.5,
            similarity_boost: config?.similarityBoost || 0.75
          }
        }
      )

      const reader = (audioStream as any).getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        onChunk(value)
      }
    } catch (error) {
      console.error('Streaming TTS error:', error)
      throw new Error('Failed to stream speech')
    }
  }

  /**
   * Transcribe audio to text using speech recognition
   */
  async speechToText(
    audioBuffer: Buffer,
    language: string = 'en'
  ): Promise<TranscriptionResult> {
    // In production, this would integrate with a speech-to-text service
    // like Google Cloud Speech-to-Text, AWS Transcribe, or OpenAI Whisper
    
    // For now, return a mock result
    // In real implementation:
    // const result = await transcriptionService.transcribe(audioBuffer, { language })
    
    return {
      text: '',
      confidence: 0,
      language,
      segments: []
    }
  }

  /**
   * Analyze emotional tone from voice
   */
  async analyzeEmotion(audioBuffer: Buffer): Promise<EmotionalAnalysis> {
    // This would integrate with emotion detection services
    // like Hume AI, Vokaturi, or custom models
    
    // Mock implementation
    return {
      primary: 'neutral',
      confidence: 0.8,
      arousal: 0.5,
      valence: 0
    }
  }

  /**
   * Clone a user's voice for personalized playback
   */
  async cloneUserVoice(
    userId: string,
    audioSamples: Buffer[]
  ): Promise<string> {
    try {
      // Create voice clone with Eleven Labs
      const voice = await this.elevenLabs.voices.add({
        name: `User_${userId}_Voice`,
        files: audioSamples.map(buffer => new Blob([buffer])),
        description: 'Cloned voice for memory narration'
      })

      // Store voice ID for user
      this.userVoiceProfiles.set(userId, voice.voice_id)
      
      return voice.voice_id
    } catch (error) {
      console.error('Voice cloning error:', error)
      throw new Error('Failed to clone voice')
    }
  }

  /**
   * Generate memory narration in user's own voice
   */
  async narrateMemory(
    memoryText: string,
    userId: string,
    useOwnVoice: boolean = false
  ): Promise<Buffer> {
    const voiceId = useOwnVoice 
      ? this.userVoiceProfiles.get(userId) || this.defaultVoiceId
      : this.defaultVoiceId

    return this.textToSpeech(memoryText, { 
      voiceId,
      stability: 0.7, // Higher stability for narration
      similarityBoost: 0.8
    })
  }

  /**
   * Create audio memory from voice recording
   */
  async processVoiceMemory(
    audioBuffer: Buffer,
    userId: string
  ): Promise<{
    transcription: TranscriptionResult
    emotion: EmotionalAnalysis
    audioUrl?: string
  }> {
    // Transcribe the audio
    const transcription = await this.speechToText(audioBuffer)
    
    // Analyze emotional content
    const emotion = await this.analyzeEmotion(audioBuffer)
    
    // Optionally store the audio file
    // const audioUrl = await this.storeAudio(audioBuffer, userId)
    
    return {
      transcription,
      emotion,
      // audioUrl
    }
  }

  /**
   * Generate contextual voice prompts for memory capture
   */
  async generateMemoryPrompt(
    context: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
      hasRecentMemories: boolean
      lastMemoryTheme?: string
      userName?: string
    }
  ): Promise<Buffer> {
    let prompt = ''
    
    // Generate contextual greeting
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon', 
      evening: 'Good evening',
      night: 'Hello'
    }
    
    prompt = `${greetings[context.timeOfDay]}${context.userName ? `, ${context.userName}` : ''}! `
    
    // Add contextual prompt
    if (context.hasRecentMemories && context.lastMemoryTheme) {
      const prompts = [
        `I noticed you were sharing about ${context.lastMemoryTheme}. Would you like to add more details to that story?`,
        `Your last memory about ${context.lastMemoryTheme} was wonderful. Any other moments from that time you'd like to capture?`,
        `Building on your ${context.lastMemoryTheme} memories, is there anything else you'd like to share?`
      ]
      prompt += prompts[Math.floor(Math.random() * prompts.length)]
    } else {
      const prompts = [
        'What memory would you like to preserve today?',
        'Tell me about a moment that made you smile recently.',
        'Is there a story from your past you\'d like to share?',
        'What\'s on your mind today? I\'m here to help you capture it.',
        'Share a memory - it could be from yesterday or years ago.'
      ]
      prompt += prompts[Math.floor(Math.random() * prompts.length)]
    }
    
    return this.textToSpeech(prompt, {
      stability: 0.6,
      similarityBoost: 0.75,
      style: 0.6 // Slightly more expressive for prompts
    })
  }

  /**
   * Convert memories to audio stories
   */
  async createAudioStory(
    memories: Array<{
      title: string
      content: string
      date: Date
    }>,
    userId: string,
    config?: {
      includeMusic?: boolean
      voiceId?: string
      transitionSounds?: boolean
    }
  ): Promise<Buffer> {
    // Create narrative structure
    const story = this.structureStory(memories)
    
    // Generate narration
    const narration = await this.textToSpeech(story, {
      voiceId: config?.voiceId || this.defaultVoiceId,
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.7 // More expressive for storytelling
    })
    
    // In production, could add background music and transitions
    // using audio processing libraries
    
    return narration
  }

  private structureStory(memories: Array<{ title: string; content: string; date: Date }>): string {
    let story = 'Let me tell you a story from your memories.\n\n'
    
    memories.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    memories.forEach((memory, index) => {
      if (index === 0) {
        story += `It all began ${this.formatDate(memory.date)}. `
      } else {
        story += `\n\nThen, ${this.formatDate(memory.date)}, `
      }
      
      if (memory.title) {
        story += `something special happened: ${memory.title}. `
      }
      
      story += memory.content
    })
    
    story += '\n\nThese are the moments that make up your story.'
    
    return story
  }

  private formatDate(date: Date): string {
    const now = new Date()
    const diffYears = now.getFullYear() - date.getFullYear()
    
    if (diffYears === 0) {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    } else if (diffYears === 1) {
      return 'last year'
    } else {
      return `${diffYears} years ago`
    }
  }

  /**
   * Get available voices for user selection
   */
  async getAvailableVoices(): Promise<Array<{
    id: string
    name: string
    preview_url: string
    category: string
  }>> {
    const voices = await this.elevenLabs.voices.getAll()
    
    return voices.voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name || '',
      preview_url: voice.preview_url || '',
      category: voice.category || 'general'
    }))
  }
}