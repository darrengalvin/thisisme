'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Bot, User, Volume2, VolumeX, Power, PowerOff } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ContinuousVoiceChatProps {
  onMemoryCreated?: (memory: any) => void
}

export default function ContinuousVoiceChat({ onMemoryCreated }: ContinuousVoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [conversationMode, setConversationMode] = useState<'waiting' | 'listening' | 'thinking' | 'speaking'>('waiting')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastTranscription, setLastTranscription] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startContinuousConversation = async () => {
    try {
      setError(null)
      console.log('🎙️ Starting continuous voice conversation...')
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })
      
      streamRef.current = stream
      setIsConnected(true)
      
      // Send AI greeting and start listening
      await sendAIGreeting()
      await startVoiceActivityDetection()
      
    } catch (error) {
      console.error('Failed to start conversation:', error)
      setError('Failed to access microphone. Please check permissions.')
    }
  }

  const stopContinuousConversation = () => {
    console.log('🛑 Stopping continuous conversation...')
    
    // Stop all audio
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
    setConversationMode('waiting')
  }

  const sendAIGreeting = async () => {
    const greeting = "Hi! I'm your memory assistant. I'm ready to have a conversation about your memories. What would you like to share today?"
    
    const greetingMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }
    
    setMessages([greetingMessage])
    
    // Play AI greeting
    await playAIResponse(greeting)
  }

  const startVoiceActivityDetection = async () => {
    if (!streamRef.current) return
    
    console.log('🎧 Starting voice activity detection...')
    setConversationMode('listening')
    setIsListening(true)
    
    // Create MediaRecorder for continuous recording
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
      
      console.log('🎤 Processing recorded audio...')
      setConversationMode('thinking')
      
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
      
      // Skip very small audio files (likely silence)
      if (audioBlob.size < 10000) { // Less than 10KB is likely silence
        console.log('🔇 Audio too small, likely silence - skipping transcription')
        setLastTranscription('🔇 Audio too quiet (silence detected)')
        setConversationMode('listening')
        audioChunksRef.current = []
        return
      }
      
      // Transcribe and get AI response
      await processUserSpeech(audioBlob)
      
      // Reset for next recording
      audioChunksRef.current = []
    }
    
    // Start recording in chunks (every 3 seconds)
    mediaRecorder.start()
    
    // Set up automatic stop/restart for continuous listening
    setTimeout(() => {
      if (mediaRecorder.state === 'recording' && !isAISpeaking) {
        mediaRecorder.stop()
        
        // Restart listening after processing (if still connected)
        setTimeout(() => {
          if (isConnected && !isAISpeaking) {
            startVoiceActivityDetection()
          }
        }, 1000)
      }
    }, 3000) // 3-second chunks
  }

  const processUserSpeech = async (audioBlob: Blob) => {
    try {
      setDebugInfo(`🎤 Processing audio: ${Math.round(audioBlob.size / 1024)}KB`)
      
      // Transcribe speech
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      const transcribeResponse = await fetch('/api/ai/speech-to-text-test', {
        method: 'POST',
        body: formData
      })
      
      const transcribeData = await transcribeResponse.json()
      setDebugInfo(`📝 Transcription response: ${transcribeData.success ? 'Success' : 'Failed'}`)
      
      if (!transcribeData.success || !transcribeData.transcription?.trim()) {
        console.log('🔇 No speech detected, continuing to listen...')
        setLastTranscription('🔇 No speech detected')
        setDebugInfo(`❌ ${transcribeData.error || 'No speech detected'}`)
        return
      }
      
      const userText = transcribeData.transcription.trim()
      
      // Filter out common Whisper hallucinations for silence/background noise
      const commonHallucinations = [
        'thank you', 'thanks', 'thank you.', 'thanks.', 
        'you', 'you.', 'bye', 'bye.', 'okay', 'okay.', 
        'mm-hmm', 'uh-huh', 'hmm', 'um', 'uh', 'ah',
        '...', 'silence', 'background'
      ]
      
      if (commonHallucinations.includes(userText.toLowerCase())) {
        console.log('🤔 Detected likely hallucination:', userText)
        setLastTranscription(`🤔 Filtered out likely noise: "${userText}"`)
        setDebugInfo(`🚫 Filtered hallucination/background noise`)
        return
      }
      
      console.log('👤 User said:', userText)
      setLastTranscription(`👤 You said: "${userText}"`)
      setDebugInfo(`✅ Speech recognized successfully!`)
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      // Get AI response
      const aiResponse = await fetch('/api/ai/memory-assistant-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          sessionId,
          conversationHistory: messages
        })
      })
      
      const aiData = await aiResponse.json()
      
      if (aiData.success) {
        setSessionId(aiData.sessionId)
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiData.response,
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        // Play AI response
        await playAIResponse(aiData.response)
      }
      
    } catch (error) {
      console.error('Error processing speech:', error)
      setError('Failed to process speech. Continuing conversation...')
    }
  }

  const playAIResponse = async (text: string) => {
    try {
      setConversationMode('speaking')
      setIsAISpeaking(true)
      
      console.log('🔊 AI speaking:', text.substring(0, 50))
      
      const response = await fetch('/api/ai/voice-synthesis-test', {
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
        
        currentAudioRef.current = audio
        
        audio.onended = () => {
          console.log('🔊 AI finished speaking, resuming listening...')
          setIsAISpeaking(false)
          setConversationMode('listening')
          
          // Resume listening after AI finishes speaking
          if (isConnected) {
            setTimeout(() => startVoiceActivityDetection(), 500)
          }
        }
        
        audio.onerror = () => {
          console.error('Audio playback failed')
          setIsAISpeaking(false)
          setConversationMode('listening')
          if (isConnected) {
            setTimeout(() => startVoiceActivityDetection(), 500)
          }
        }
        
        await audio.play()
      }
    } catch (error) {
      console.error('Error playing AI response:', error)
      setIsAISpeaking(false)
      setConversationMode('listening')
    }
  }

  const getStatusColor = () => {
    switch (conversationMode) {
      case 'listening': return 'bg-green-500'
      case 'thinking': return 'bg-yellow-500'
      case 'speaking': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (conversationMode) {
      case 'listening': return 'Listening...'
      case 'thinking': return 'Processing...'
      case 'speaking': return 'AI Speaking...'
      default: return 'Ready to start'
    }
  }

  return (
    <div className="flex flex-col h-[800px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Continuous Voice Assistant</h2>
            <p className="text-sm text-white/80">Real-time memory conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isListening || isAISpeaking ? 'animate-pulse' : ''}`}></div>
            <span>{getStatusText()}</span>
          </div>
          
          {/* Connection Toggle */}
          <button
            onClick={isConnected ? stopContinuousConversation : startContinuousConversation}
            className={`p-3 rounded-full transition-all duration-200 ${
              isConnected 
                ? 'bg-red-500/40 ring-2 ring-red-300/50 shadow-lg' 
                : 'bg-green-500/40 ring-2 ring-green-300/50 shadow-lg'
            } backdrop-blur-sm`}
            title={isConnected ? 'Stop conversation' : 'Start continuous conversation'}
          >
            {isConnected ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Ready for continuous conversation</p>
            <p className="text-sm">Click the power button to start an open voice conversation</p>
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
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                {message.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
              </div>
              
              <div className="space-y-1">
                <div className={`rounded-2xl px-5 py-4 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' 
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                <div className={`text-xs px-2 ${
                  message.role === 'user' ? 'text-right text-gray-500' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Status Bar */}
      <div className="p-4 border-t bg-gray-50">
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

        {/* Speech Transcription Display */}
        {lastTranscription && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💬</span>
              </div>
              <span className="text-blue-800 text-sm font-medium">{lastTranscription}</span>
            </div>
          </div>
        )}

        {/* Debug Info Display */}
        {debugInfo && (
          <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700">
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            {isConnected && (
              <>
                <div className="flex items-center gap-2">
                  <Mic className={`w-4 h-4 ${isListening ? 'text-green-600' : 'text-gray-400'}`} />
                  <span>Microphone {isListening ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 ${isAISpeaking ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>AI Voice {isAISpeaking ? 'Speaking' : 'Ready'}</span>
                </div>
              </>
            )}
          </div>
          <span className="text-purple-600 font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {!isConnected && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Press the power button to start a continuous voice conversation where the AI listens and responds automatically
            </p>
          </div>
        )}
      </div>
    </div>
  )
}