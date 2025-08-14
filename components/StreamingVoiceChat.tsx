'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Bot, User, Volume2, Power, PowerOff, Zap } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isPartial?: boolean
  priority?: 'high' | 'medium' | 'low'
}

interface StreamingVoiceChatProps {
  onMemoryCreated?: (memory: any) => void
}

export default function StreamingVoiceChat({ onMemoryCreated }: StreamingVoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [conversationMode, setConversationMode] = useState<'waiting' | 'listening' | 'processing' | 'speaking'>('waiting')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Streaming states
  const [currentTranscription, setCurrentTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState<string>('')
  const [audioQueueSize, setAudioQueueSize] = useState(0)
  
  // Debug states
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [audioStats, setAudioStats] = useState<{size: number, type: string} | null>(null)
  
  // Refs for streaming audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transcriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Streaming intervals
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startStreamingConversation = async () => {
    try {
      setError(null)
      console.log('⚡ Starting streaming voice conversation...')
      
      // Get high-quality microphone access for streaming
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
      
      streamRef.current = stream
      setIsConnected(true)
      
      // Send AI greeting and start streaming
      await sendStreamingGreeting()
      await startRealtimeListening()
      
    } catch (error) {
      console.error('Failed to start streaming conversation:', error)
      setError('Failed to access microphone for streaming. Please check permissions.')
    }
  }

  const stopStreamingConversation = () => {
    console.log('⚡ Stopping streaming conversation...')
    
    // Clear all timeouts and intervals
    if (transcriptionTimeoutRef.current) {
      clearTimeout(transcriptionTimeoutRef.current)
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
    }
    
    // Stop audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsConnected(false)
    setIsListening(false)
    setIsAISpeaking(false)
    setIsTranscribing(false)
    setConversationMode('waiting')
    setCurrentTranscription('')
    setStreamingResponse('')
  }

  const sendStreamingGreeting = async () => {
    const greeting = "Hi! I'm your streaming memory companion. I can understand you in real-time as you speak. What memory would you like to explore today?"
    
    const greetingMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      priority: 'high'
    }
    
    setMessages([greetingMessage])
    await playStreamingAudioResponse(greeting, 'high')
  }

  const startRealtimeListening = async () => {
    if (!streamRef.current) return
    
    console.log('⚡ Starting real-time audio processing...')
    setConversationMode('listening')
    setIsListening(true)
    
    // Create MediaRecorder for smaller, frequent chunks
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    })
    
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }
    
    mediaRecorder.onstop = async () => {
      if (audioChunksRef.current.length === 0) return
      
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
      
      // Skip tiny audio chunks (likely silence)
      if (audioBlob.size < 5000) {
        console.log('⚡ Skipping tiny audio chunk')
        audioChunksRef.current = []
        return
      }
      
      // Process in streaming mode
      await processStreamingAudio(audioBlob)
      audioChunksRef.current = []
    }
    
    // Start with smaller chunks for more responsive streaming
    mediaRecorder.start()
    
    // Set up automatic chunk processing every 1.5 seconds
    streamingIntervalRef.current = setInterval(() => {
      if (mediaRecorder.state === 'recording' && !isAISpeaking && !isTranscribing) {
        mediaRecorder.stop()
        
        // Restart immediately for continuous streaming, but only when AI is not speaking
        setTimeout(() => {
          if (isConnected && !isAISpeaking && !isTranscribing) {
            mediaRecorder.start()
          }
        }, 100)
      }
    }, 1500) // 1.5 second chunks for streaming
  }

  const processStreamingAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      setConversationMode('processing')
      
      console.log(`⚡ Processing streaming audio: ${Math.round(audioBlob.size / 1024)}KB`)
      console.log(`⚡ Audio details:`, {
        size: audioBlob.size,
        type: audioBlob.type,
        timestamp: new Date().toISOString()
      })
      
      // Update debug display
      setAudioStats({ size: audioBlob.size, type: audioBlob.type })
      setDebugLog(prev => [...prev.slice(-5), `📹 Captured ${Math.round(audioBlob.size/1024)}KB ${audioBlob.type}`])
      
      // Use streaming speech-to-text endpoint
      const formData = new FormData()
      formData.append('audio', audioBlob, 'streaming.webm')
      
      const transcribeResponse = await fetch('/api/ai/streaming-speech-to-text', {
        method: 'POST',
        body: formData
      })
      
      const transcribeData = await transcribeResponse.json()
      console.log('⚡ Full transcription response:', transcribeData)
      
      if (!transcribeData.success) {
        console.log('⚡ No speech in chunk:', transcribeData.reason)
        setCurrentTranscription(`🔇 ${transcribeData.reason || 'No speech'}`)
        setIsTranscribing(false)
        setConversationMode('listening')
        return
      }
      
      const userText = transcribeData.transcription.trim()
      console.log('⚡ Streaming transcription:', userText)
      console.log('⚡ Transcription confidence:', transcribeData.confidence)
      console.log('⚡ Audio duration:', transcribeData.duration)
      
      // Update current transcription display
      setCurrentTranscription(userText)
      
      // If transcription seems complete, process it
      if (transcribeData.isComplete || userText.length > 20) {
        await processCompleteTranscription(userText)
      } else {
        // Wait a bit more for potential completion
        if (transcriptionTimeoutRef.current) {
          clearTimeout(transcriptionTimeoutRef.current)
        }
        transcriptionTimeoutRef.current = setTimeout(() => {
          if (userText.length > 5) {
            processCompleteTranscription(userText)
          }
        }, 2000)
      }
      
    } catch (error) {
      console.error('⚡ Streaming audio processing error:', error)
      setIsTranscribing(false)
      setConversationMode('listening')
    }
  }

  const processCompleteTranscription = async (userText: string) => {
    try {
      console.log('⚡ Processing complete transcription:', userText)
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setCurrentTranscription('') // Clear partial display
      
      // Get streaming AI response
      const aiResponse = await fetch('/api/ai/streaming-memory-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          sessionId,
          conversationHistory: messages,
          isPartial: false
        })
      })
      
      const aiData = await aiResponse.json()
      
      if (aiData.success) {
        setSessionId(aiData.sessionId)
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiData.response,
          timestamp: new Date(),
          priority: aiData.priority
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        // Play AI response with priority-based streaming
        await playStreamingAudioResponse(aiData.response, aiData.priority)
      }
      
      setIsTranscribing(false)
      
    } catch (error) {
      console.error('⚡ Error processing complete transcription:', error)
      setIsTranscribing(false)
      setConversationMode('listening')
    }
  }

  const playStreamingAudioResponse = async (text: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    try {
      setConversationMode('speaking')
      setIsAISpeaking(true)
      setAudioQueueSize(prev => prev + 1)
      
      console.log(`⚡ Playing ${priority} priority response:`, text.substring(0, 50))
      
      const response = await fetch('/api/ai/voice-synthesis-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          priority,
          voiceId: '21m00Tcm4TlvDq8ikWAM' // Rachel voice for consistency
        })
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        currentAudioRef.current = audio
        
        audio.onended = () => {
          console.log('⚡ Streaming audio finished')
          setIsAISpeaking(false)
          setConversationMode('listening')
          setAudioQueueSize(prev => Math.max(0, prev - 1))
          
          // Resume listening after a longer pause to avoid feedback
          if (isConnected && mediaRecorderRef.current) {
            setTimeout(() => {
              // Restart listening cycle only when AI is completely done
              if (!isAISpeaking && mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                setConversationMode('listening')
                mediaRecorderRef.current.start()
                console.log('⚡ Resumed listening after AI speech')
              }
            }, 1000) // Longer delay to prevent feedback
          }
        }
        
        audio.onerror = () => {
          console.error('⚡ Audio playback failed')
          setIsAISpeaking(false)
          setConversationMode('listening')
          setAudioQueueSize(prev => Math.max(0, prev - 1))
        }
        
        await audio.play()
      }
    } catch (error) {
      console.error('⚡ Error playing streaming audio:', error)
      setIsAISpeaking(false)
      setConversationMode('listening')
      setAudioQueueSize(prev => Math.max(0, prev - 1))
    }
  }

  const getStatusColor = () => {
    switch (conversationMode) {
      case 'listening': return 'bg-green-500'
      case 'processing': return 'bg-yellow-500'
      case 'speaking': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (conversationMode) {
      case 'listening': return 'Listening in real-time...'
      case 'processing': return 'Processing speech...'
      case 'speaking': return 'AI responding...'
      default: return 'Ready for streaming'
    }
  }

  return (
    <div className="flex flex-col h-[800px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Streaming Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 via-blue-600 to-purple-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Streaming Voice Memory Assistant</h2>
            <p className="text-sm text-white/80">Real-time conversation • Timeline-aware</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Enhanced Status Indicator */}
          <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isListening || isAISpeaking || isTranscribing ? 'animate-pulse' : ''}`}></div>
            <span>{getStatusText()}</span>
            {audioQueueSize > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-500/30 rounded-full text-xs">Queue: {audioQueueSize}</span>
            )}
          </div>
          
          {/* Streaming Connection Toggle */}
          <button
            onClick={isConnected ? stopStreamingConversation : startStreamingConversation}
            className={`p-3 rounded-full transition-all duration-200 ${
              isConnected 
                ? 'bg-red-500/40 ring-2 ring-red-300/50 shadow-lg animate-pulse' 
                : 'bg-green-500/40 ring-2 ring-green-300/50 shadow-lg'
            } backdrop-blur-sm`}
            title={isConnected ? 'Stop streaming conversation' : 'Start real-time streaming conversation'}
          >
            {isConnected ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages with Streaming Indicators */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Streaming Voice Memory Assistant</p>
            <p className="text-sm">Experience real-time conversation with timeline-aware memory organization</p>
            <p className="text-xs mt-2 text-green-600">⚡ Powered by streaming Whisper + GPT + ElevenLabs</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}>
                {message.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
              </div>
              
              <div className="space-y-1">
                <div className={`rounded-2xl px-5 py-4 shadow-sm relative ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' 
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  {message.priority === 'high' && message.role === 'assistant' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                <div className={`text-xs px-2 ${
                  message.role === 'user' ? 'text-right text-gray-500' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {message.priority && message.role === 'assistant' && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      message.priority === 'high' ? 'bg-red-100 text-red-700' :
                      message.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {message.priority}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Current Transcription Display */}
        {currentTranscription && (
          <div className="flex justify-end">
            <div className="flex gap-3 max-w-[85%] flex-row-reverse">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md opacity-70">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl px-5 py-4 shadow-sm border-2 border-green-400 animate-pulse">
                  <p className="whitespace-pre-wrap leading-relaxed">{currentTranscription}<span className="animate-ping">|</span></p>
                </div>
                <div className="text-xs px-2 text-right text-gray-500">
                  {isTranscribing ? 'Transcribing...' : 'Processing...'}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Streaming Status Bar */}
      <div className="p-4 border-t bg-gradient-to-r from-green-50 to-blue-50">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-600">
            {isConnected && (
              <>
                <div className="flex items-center gap-2">
                  <Mic className={`w-4 h-4 ${isListening ? 'text-green-600' : 'text-gray-400'}`} />
                  <span>Real-time Audio {isListening ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 ${isAISpeaking ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>AI Voice {isAISpeaking ? 'Speaking' : 'Ready'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${isTranscribing ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span>Transcription {isTranscribing ? 'Processing' : 'Ready'}</span>
                </div>
              </>
            )}
          </div>
          <span className={`font-medium ${
            isConnected ? 'text-green-600' : 'text-gray-600'
          }`}>
            {isConnected ? '⚡ Streaming Active' : 'Disconnected'}
          </span>
        </div>
        
        {/* Debug Panel */}
        {isConnected && (
          <div className="mt-3 p-3 bg-gray-100 border rounded text-xs">
            <p className="font-semibold text-gray-800 mb-2">🔍 Debug Information</p>
            <div className="grid grid-cols-2 gap-2 text-gray-700">
              <div>
                <strong>Audio Stats:</strong> {audioStats ? `${Math.round(audioStats.size/1024)}KB ${audioStats.type}` : 'None'}
              </div>
              <div>
                <strong>Transcribing:</strong> {isTranscribing ? '✅ Active' : '⭕ Idle'}
              </div>
            </div>
            {debugLog.length > 0 && (
              <div className="mt-2">
                <strong>Recent Activity:</strong>
                <div className="max-h-16 overflow-y-auto bg-gray-50 p-1 mt-1 rounded text-xs">
                  {debugLog.map((log, i) => (
                    <div key={i} className="text-xs">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isConnected && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Experience real-time streaming conversation with intelligent memory organization
            </p>
            <p className="text-xs text-gray-500">
              1.5-second audio chunks • Timeline-aware responses • Priority-based audio streaming
            </p>
          </div>
        )}
      </div>
    </div>
  )
}