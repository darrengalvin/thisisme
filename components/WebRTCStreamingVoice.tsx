'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Zap, Activity } from 'lucide-react'

interface StreamingMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export default function WebRTCStreamingVoice() {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [messages, setMessages] = useState<StreamingMessage[]>([])
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Simplified states
  const [showDebug, setShowDebug] = useState(false)
  const [conversationState, setConversationState] = useState<'idle' | 'listening' | 'processing' | 'ai_speaking'>('idle')
  
  // Timing refs
  const userSpeechStartTime = useRef<number | null>(null)
  const aiSpeechStartTime = useRef<number | null>(null)

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  
  // Audio processing refs
  const audioChunksRef = useRef<Float32Array[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const silenceCountRef = useRef<number>(0)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  
  // State refs for audio processor (to avoid stale closure)
  const isListeningRef = useRef(false)
  const isAISpeakingRef = useRef(false)
  const currentTranscriptionRef = useRef('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTranscription, streamingResponse])
  
  // Update refs when state changes (avoid stale closures in audio processor)
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])
  
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking
  }, [isAISpeaking])
  
  useEffect(() => {
    currentTranscriptionRef.current = currentTranscription
  }, [currentTranscription])



  const initializeWebRTC = async () => {
    try {
      console.log('🚀 Initializing WebRTC streaming...')
      setError(null)

      // Get user media with high-quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          sampleSize: 16
        }
      })

      localStreamRef.current = stream
      
      // Initialize AudioContext for real-time processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Create ScriptProcessorNode for real-time audio chunks
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      processorRef.current.onaudioprocess = (event) => {
        if (isListeningRef.current && !isAISpeakingRef.current) {
          const inputBuffer = event.inputBuffer.getChannelData(0)
          
          // Check for actual audio (not silence)
          const hasAudio = inputBuffer.some(sample => Math.abs(sample) > 0.01)
          
          if (hasAudio) {
            // Reset silence counter when speech detected
            silenceCountRef.current = 0
            lastSpeechTimeRef.current = Date.now()
            
            // Convert to Float32Array and add to chunks
            audioChunksRef.current.push(new Float32Array(inputBuffer))
            
            // Only log every 5th chunk to reduce spam
            if (audioChunksRef.current.length % 5 === 0) {
              console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎤 Audio: ${audioChunksRef.current.length} chunks captured`)
            }
            
            // Process chunks every ~1.0 seconds for stable transcription
            if (audioChunksRef.current.length >= 16) { // 16 * 4096 samples ≈ 1.0 seconds at 16kHz
              console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔄 Processing 16 chunks (1.0 seconds of audio)...`)
              processAudioChunks()
            }
          } else {
            // Silence detected - increment counter
            silenceCountRef.current++
            
            // If 1.2 seconds of silence (about 18 chunks), user has stopped speaking - balanced response
            if (silenceCountRef.current > 18) {
              const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current
              
              // Process any remaining audio chunks first
              if (audioChunksRef.current.length > 0) {
                console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🤐 SILENCE DETECTED (${(timeSinceLastSpeech/1000).toFixed(1)}s) - processing ${audioChunksRef.current.length} final chunks`)
                console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎧 SPEECH-TO-TEXT PIPELINE START`)
                processAudioChunks()
              }
              
              // Send the complete transcription after a short delay
              setTimeout(() => {
                if (currentTranscriptionRef.current.trim()) {
                  const fullTranscription = currentTranscriptionRef.current.trim()
                  console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🚀 SENDING AFTER SILENCE: "${fullTranscription}"`)
                  sendToGPT4oStreaming(fullTranscription, true)
                  // Don't clear here - let sendToGPT4oStreaming handle it
                }
              }, 800) // Delay to ensure all transcriptions are processed
              
              // Reset silence counter
              silenceCountRef.current = 0
            }
          }
        } else {
          // Audio ignored - no debug spam needed
        }
      }
      
      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      
      setIsConnected(true)
      console.log('✅ WebRTC streaming initialized successfully')
      
      // Send AI greeting which will auto-start listening when done
      await sendAIGreeting()
      
    } catch (error) {
      console.error('❌ WebRTC initialization failed:', error)
      setError('Failed to initialize audio streaming. Please check microphone permissions.')
    }
  }

  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('🔇 No audio chunks to process')
      return
    }

    try {
      // Start processing
      // Processing audio
      
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎯 Processing ${audioChunksRef.current.length} audio chunks...`)
      
      // Combine audio chunks
      const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0)
      const combinedAudio = new Float32Array(totalLength)
      let offset = 0
      
      for (const chunk of audioChunksRef.current) {
        combinedAudio.set(chunk, offset)
        offset += chunk.length
      }
      
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 Combined audio: ${totalLength} samples (${Math.round(totalLength/16000*1000)}ms)`)
      
      // Convert to WAV blob for Whisper
      const wavBlob = audioBufferToWav(combinedAudio, 16000)
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 📦 Created WAV blob: ${Math.round(wavBlob.size/1024)}KB`)
      
      // Clear chunks for next batch
      audioChunksRef.current = []
      
      // Send to streaming Whisper
      await transcribeAudioStreaming(wavBlob)
      
    } catch (error) {
      if (showDebug) console.log(`Audio processing error: ${error}`)
      console.error('Audio processing error')
    }
  }

  const transcribeAudioStreaming = async (audioBlob: Blob) => {
    try {
      const whisperStartTime = Date.now()
      console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎧 WHISPER API CALL START`)
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎯 Sending ${(audioBlob.size/1024).toFixed(1)}KB audio to Whisper...`)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'stream.wav')
      
      const response = await fetch('/api/ai/whisper-streaming', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      const whisperTime = Date.now() - whisperStartTime
      console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎧 WHISPER COMPLETE: ${whisperTime}ms`)
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 📡 Whisper response:`, data)
      
      if (data.success && data.transcription) {
        console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] ✅ Transcription received:`, data.transcription)
        
        setCurrentTranscription(prev => {
          const newText = prev + ' ' + data.transcription
          return newText
        })
        
        // DON'T send partial transcriptions - wait for user to finish
        // This prevents "What's on your mind?" responses mid-sentence
        console.log('💬 Holding transcription, waiting for user to finish...')
      } else {
        console.log('⚠️ Whisper failed:', data.error || data.reason || 'No transcription')
      }
      
    } catch (error) {
      console.error('❌ Transcription error:', error)
    }
  }

  const sendToGPT4oStreaming = async (text: string, isFinal: boolean = true) => {
    try {
      // Cancel previous streaming if still active
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      
      const pipelineStartTime = Date.now()
      console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🚀 PIPELINE START: User finished speaking`)
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🧠 Sending to GPT-4o streaming:`, text)
      
      if (isFinal && text.trim()) {
        // Add user message with the actual text
        const userMessage: StreamingMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: text.trim(), // Use the text parameter, not currentTranscription
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])
        setCurrentTranscription('') // Clear after adding message
      }
      
      // Initialize streaming response
      // Clear processed sentences and audio queue for new conversation
      processedSentences.current.clear()
      audioQueue.current = []
      isPlayingAudio.current = false
      
      const assistantMessage: StreamingMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }
      setMessages(prev => [...prev, assistantMessage])
      setStreamingResponse('')
      
      const gptStartTime = Date.now()
      console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🧠 GPT-4o API CALL START (${gptStartTime - pipelineStartTime}ms from pipeline start)`)
      
      const response = await fetch('/api/ai/gpt4o-streaming', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(), // Use the text parameter passed to the function
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        }),
        signal: abortControllerRef.current.signal
      })
      
      console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🧠 GPT-4o RESPONSE RECEIVED (${Date.now() - gptStartTime}ms API call time)`)
      
      if (!response.ok) throw new Error('GPT-4o streaming failed')
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No stream reader available')
      
      const decoder = new TextDecoder()
      let accumulatedResponse = ''
      let lastProcessedLength = 0
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                accumulatedResponse += data.content
                setStreamingResponse(accumulatedResponse)
                
                // Update the message in real-time
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: accumulatedResponse }
                      : msg
                  )
                )
                
                // 🚀 SENTENCE-LEVEL STREAMING: Check for complete sentences
                console.log(`🔍 DEBUG: Checking sentences for: "${accumulatedResponse}"`)
                await checkAndStreamCompleteSentences(accumulatedResponse, lastProcessedLength)
                lastProcessedLength = accumulatedResponse.length
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
      
      // Mark streaming as complete
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, isStreaming: false }
            : msg
        )
      )
      
      // Send any remaining text to TTS
      const remainingText = accumulatedResponse.slice(lastProcessedLength).trim()
      if (remainingText) {
        await playStreamingTTS(remainingText)
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 GPT-4o streaming aborted')
      } else {
        console.error('❌ GPT-4o streaming error:', error)
      }
    }
  }

  // 🚀 SENTENCE-LEVEL STREAMING: Process complete sentences immediately
  const processedSentences = useRef<Set<string>>(new Set())
  
  const checkAndStreamCompleteSentences = async (fullText: string, lastProcessedLength: number) => {
    const sentenceCheckTime = Date.now()
    console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔍 SENTENCE CHECK START`)
    console.log(`🔍 SENTENCE CHECK: Full text length: ${fullText.length}, Last processed: ${lastProcessedLength}`)
    
    // Split by sentence endings and process each complete sentence
    const sentences = fullText.split(/([.!?]+)/).filter(s => s.trim().length > 0)
    let currentSentence = ''
    
    for (let i = 0; i < sentences.length; i += 2) {
      const text = sentences[i]?.trim()
      const punctuation = sentences[i + 1]
      
      if (text && punctuation && /[.!?]/.test(punctuation)) {
        currentSentence = text + punctuation
        
        // Only process if we haven't seen this sentence and it's substantial
        if (currentSentence.length > 15 && !processedSentences.current.has(currentSentence)) {
          console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎯 NEW COMPLETE SENTENCE: "${currentSentence}" (${Date.now() - sentenceCheckTime}ms from sentence check)`)
          processedSentences.current.add(currentSentence)
          
          // Don't await - process in parallel
          playStreamingTTS(currentSentence).catch(console.error)
        }
      }
    }
  }

  // 🎵 AUDIO QUEUE: Prevent overlapping TTS
  const audioQueue = useRef<string[]>([])
  const isPlayingAudio = useRef(false)
  
  const playStreamingTTS = async (text: string) => {
    // Add to queue
    audioQueue.current.push(text)
    console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎵 QUEUED TTS: "${text}" (Queue length: ${audioQueue.current.length})`)
    
    // If already playing, let the queue handle it
    if (isPlayingAudio.current) {
      return
    }
    
    // Start processing queue
    await processAudioQueue()
  }
  


  const processAudioQueue = async () => {
    if (isPlayingAudio.current || audioQueue.current.length === 0) {
      return
    }
    
    isPlayingAudio.current = true
    setIsAISpeaking(true)
    
    while (audioQueue.current.length > 0) {
      const text = audioQueue.current.shift()!
      await playSingleTTS(text)
    }
    
    isPlayingAudio.current = false
    setIsAISpeaking(false)
    
    // Auto-start listening after all audio is done
    setTimeout(() => {
      setIsListening(true)
      setConversationState('listening')
      userSpeechStartTime.current = Date.now()
      setCurrentTranscription('')
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🎤 ✨ Auto-started listening after AI speech`)
    }, 500)
  }
  
  const playSingleTTS = async (text: string) => {
    try {
      aiSpeechStartTime.current = Date.now()
      
      console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 Playing TTS: "${text}"`)
      
      const response = await fetch('/api/ai/tts-streaming', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })
      
      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        if (showDebug) console.log(`Audio blob created: ${Math.round(audioBlob.size/1024)}KB`)
        
        // Return promise that resolves when audio finishes
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] ✅ TTS sentence completed`)
            resolve()
          }
          
          audio.onerror = () => {
            console.error('❌ TTS playback failed')
            reject(new Error('TTS playback failed'))
          }
          
          audio.play().then(() => {
            console.log(`[${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 Audio playback started`)
          }).catch(reject)
        })
      }
      
    } catch (error) {
      console.error('❌ TTS streaming error:', error)
      setIsAISpeaking(false)
      setConversationState('idle')
    }
  }

  const sendAIGreeting = async () => {
    const greeting = "Hi! I'm your WebRTC streaming voice assistant. I can understand you in real-time and respond immediately. What would you like to talk about?"
    
    const greetingMessage: StreamingMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }
    
    setMessages([greetingMessage])
    setConversationState('ai_speaking')
    await playStreamingTTS(greeting)
  }

  const startListening = () => {
    setIsListening(true)
    userSpeechStartTime.current = Date.now()
    
    console.log('🎤 Started listening')
    console.log('🎤 User started listening')
    // User started listening
  }

  const stopListening = () => {
    setIsListening(false)
    setConversationState('processing')
    console.log('🛑 Stopped listening')
    
    // Process any remaining audio chunks
    if (audioChunksRef.current.length > 0) {
      console.log(`📦 Processing ${audioChunksRef.current.length} remaining chunks`)
      processAudioChunks()
    }
    
    // Send final transcription to GPT-4o
    if (currentTranscription.trim()) {
      console.log(`🚀 Sending COMPLETE transcription: "${currentTranscription.trim()}"`)
      sendToGPT4oStreaming(currentTranscription, true)
    }
  }

  const disconnectWebRTC = () => {
    setIsConnected(false)
    setIsListening(false)
    setIsAISpeaking(false)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect()
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    console.log('🔌 WebRTC disconnected')
  }

  // Helper function to convert audio buffer to WAV
  const audioBufferToWav = (buffer: Float32Array, sampleRate: number): Blob => {
    const length = buffer.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)
    
    // Audio data
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  return (
    <div className="flex flex-col h-[800px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">WebRTC Streaming Voice Assistant</h2>
            <p className="text-sm text-white/80">Real-time • GPT-4o • WebRTC Audio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-gray-400'
            } ${isListening || isAISpeaking ? 'animate-pulse' : ''}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <button
            onClick={isConnected ? disconnectWebRTC : initializeWebRTC}
            className={`p-3 rounded-full transition-all duration-200 ${
              isConnected 
                ? 'bg-red-500/40 ring-2 ring-red-300/50 shadow-lg' 
                : 'bg-green-500/40 ring-2 ring-green-300/50 shadow-lg'
            } backdrop-blur-sm`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`rounded-2xl px-5 py-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                  : 'bg-white text-gray-800 border border-gray-200'
              } ${message.isStreaming ? 'animate-pulse' : ''}`}
              onClick={() => {
                navigator.clipboard.writeText(message.content)
                console.log('✅ Copied to clipboard:', message.content.substring(0, 50) + '...')
              }}
              title="Click to copy to clipboard"
              >
                <p className="whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">|</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Current Transcription */}
        {currentTranscription && (
          <div className="flex justify-end">
            <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl px-5 py-4 max-w-[85%] animate-pulse">
              <p className="text-blue-800">{currentTranscription}<span className="animate-ping">|</span></p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-gray-50">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
        
        {/* Simple Status Bar */}
        {isConnected && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    conversationState === 'listening' ? 'bg-green-500 animate-pulse' :
                    conversationState === 'ai_speaking' ? 'bg-blue-500 animate-pulse' :
                    conversationState === 'processing' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {conversationState === 'listening' ? '🎤 Listening...' :
                     conversationState === 'ai_speaking' ? '🔊 AI Speaking...' :
                     conversationState === 'processing' ? '⚙️ Processing...' :
                     '💬 Ready to chat'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-600"
                >
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              </div>
            </div>
            
            {/* Minimal debug info when enabled */}
            {showDebug && (
              <div className="mt-3 p-2 bg-white rounded border text-xs text-gray-600">
                <div>State: {conversationState} | Listening: {isListening ? 'Yes' : 'No'} | AI Speaking: {isAISpeaking ? 'Yes' : 'No'}</div>
                <div>Transcription: "{currentTranscription || 'None'}"</div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              Fully automatic conversation - no buttons needed!
            </div>
            <div className="text-xs text-gray-400">
              Just speak naturally after the AI finishes talking
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}