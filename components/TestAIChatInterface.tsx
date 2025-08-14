'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Bot, User, Sparkles, Volume2, Camera, Upload } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isMemoryCreated?: boolean
  shouldSuggestPhotos?: boolean
  memoryType?: string
  extraction?: {
    title?: string
    confidence: number
    themes?: string[]
    detectedPeople?: string[]
    detectedEmotions?: string[]
  }
}

interface TestAIChatInterfaceProps {
  onMemoryCreated?: (memory: any) => void
  initialPrompt?: string
}

export default function TestAIChatInterface({ onMemoryCreated, initialPrompt }: TestAIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [showExtractionDetails, setShowExtractionDetails] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: Message = {
        id: '1',
        role: 'assistant',
        content: initialPrompt || "Hi! I'm your memory companion, and I'm here to help you organize and capture your life stories with intelligent timeline awareness. I'll help you place memories in the right chapters of your life, understand when things happened, and discover vivid details you might have forgotten. \n\nWhat memory would you like to record today? It could be from your childhood, school years, work at BT, or any other period of your life - I'll help figure out exactly where it fits in your timeline.",
        timestamp: new Date()
      }
      setMessages([greeting])
      
      // Auto-play greeting if voice is enabled
      if (isVoiceEnabled && !initialPrompt) {
        setTimeout(() => {
          playVoiceResponse(greeting.content)
        }, 1000) // Slightly longer delay for natural feel
      }
    }
  }, [initialPrompt, isVoiceEnabled])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log('🧪 TEST CHAT: Sending message to test API')
      
      const response = await fetch('/api/ai/memory-assistant-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          conversationHistory: messages
        })
      })

      const data = await response.json()
      console.log('🧪 TEST CHAT: Received response:', data)

      if (data.success) {
        setSessionId(data.sessionId)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          isMemoryCreated: data.memoryCreated,
          shouldSuggestPhotos: data.shouldSuggestPhotos,
          memoryType: data.memoryType,
          extraction: data.extraction
        }

        setMessages(prev => [...prev, assistantMessage])

        if (data.memoryCreated && onMemoryCreated) {
          onMemoryCreated(data.extraction)
        }

        // Auto-play voice response if enabled
        if (isVoiceEnabled && data.response) {
          setTimeout(() => {
            playVoiceResponse(data.response)
          }, 300) // Small delay to let message render
        }
      } else {
        throw new Error(data.error || 'API call failed')
      }
    } catch (error) {
      console.error('🧪 TEST CHAT: Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVoiceRecording = async () => {
    if (!isRecording) {
      try {
        setRecordingError(null)
        setRecordingDuration(0)
        
        // Check for microphone permissions
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        })
        const audioChunks: Blob[] = []
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType })
          
          if (audioBlob.size === 0) {
            setRecordingError('No audio was recorded. Please try again.')
            return
          }
          
          // Convert to text using speech recognition
          try {
            setIsLoading(true)
            
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
            
            // Use test speech-to-text endpoint (no auth required)
            const response = await fetch('/api/ai/speech-to-text-test', {
              method: 'POST',
              body: formData
            })
            
            const data = await response.json()
            if (data.success && data.transcription && data.transcription.trim()) {
              setInput(data.transcription.trim())
              setRecordingError(null)
              // Auto-send the transcribed text after a brief delay
              setTimeout(() => {
                sendMessage()
              }, 500)
            } else {
              if (data.needsSetup) {
                setRecordingError('Speech-to-text needs OpenAI API key setup in .env.local. For now, please type your message.')
              } else {
                setRecordingError('Could not transcribe audio. Please speak more clearly and try again.')
              }
            }
          } catch (error) {
            console.error('Speech to text error:', error)
            setRecordingError('Speech-to-text failed. Try typing your message instead.')
          } finally {
            setIsLoading(false)
          }
          
          // Clean up
          stream.getTracks().forEach(track => track.stop())
        }
        
        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event)
          setRecordingError('Recording failed. Please try again.')
          setIsRecording(false)
        }
        
        mediaRecorder.start(1000) // Collect data every second
        setIsRecording(true)
        
        // Start duration timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 1
            // Auto-stop after 60 seconds
            if (newDuration >= 60) {
              mediaRecorder.stop()
              setIsRecording(false)
              if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current)
              }
            }
            return newDuration
          })
        }, 1000)
        
        // Store recorder reference
        ;(window as any).currentRecorder = mediaRecorder
        
      } catch (error) {
        console.error('Error starting recording:', error)
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setRecordingError('Microphone access denied. Please allow microphone permissions and try again.')
          } else if (error.name === 'NotFoundError') {
            setRecordingError('No microphone found. Please connect a microphone and try again.')
          } else {
            setRecordingError('Could not access microphone. Please check your settings.')
          }
        } else {
          setRecordingError('Recording failed. Please try again.')
        }
      }
    } else {
      // Stop recording
      const recorder = (window as any).currentRecorder
      if (recorder && recorder.state === 'recording') {
        recorder.stop()
      }
      setIsRecording(false)
      setRecordingDuration(0)
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  const playVoiceResponse = async (text: string) => {
    try {
      console.log('🧪 TEST CHAT: Playing voice response for:', text.substring(0, 50))
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
        audio.play()
        console.log('🧪 TEST CHAT: Voice response played successfully')
      } else {
        console.error('🧪 TEST CHAT: Voice synthesis failed with status:', response.status)
      }
    } catch (error) {
      console.error('🧪 TEST CHAT: Error playing voice response:', error)
    }
  }

  const renderExtractionBadges = (extraction: any) => {
    if (!extraction) return null

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {extraction.confidence && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Confidence: {Math.round(extraction.confidence * 100)}%
          </span>
        )}
        {extraction.themes?.map((theme: string) => (
          <span key={theme} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {theme}
          </span>
        ))}
        {extraction.detectedEmotions?.map((emotion: string) => (
          <span key={emotion} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
            {emotion}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Memory Assistant</h2>
            <p className="text-sm text-white/80">Share your memories through conversation</p>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          <div className="text-xs bg-red-500/80 px-2 py-1 rounded-full font-medium">TEST MODE</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
            {isVoiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Voice Chat</span>
              </>
            ) : (
              <>
                <span>💬</span>
                <span>Text Chat</span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVoiceEnabled 
                ? 'bg-green-500/40 ring-2 ring-green-300/50 shadow-lg' 
                : 'bg-white/10 hover:bg-white/20'
            } backdrop-blur-sm`}
            title={isVoiceEnabled ? 'Disable voice chat' : 'Enable voice conversation'}
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowExtractionDetails(!showExtractionDetails)}
            className="text-sm bg-white/20 px-3 py-2 rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            {showExtractionDetails ? 'Hide' : 'Show'} Details
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
              {/* Enhanced Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                {message.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
              </div>
              
              <div className="space-y-1">
                {/* Message Bubble */}
                <div className={`rounded-2xl px-5 py-4 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
                  {/* Memory Created Success */}
                  {message.isMemoryCreated && (
                    <div className="mt-3 p-3 bg-green-100 rounded-xl text-green-800 text-sm border border-green-200">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="font-medium">Memory saved successfully!</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Photo Suggestion */}
                  {message.shouldSuggestPhotos && !message.isMemoryCreated && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-blue-900">Want to add photos?</span>
                      </div>
                      <p className="text-sm text-blue-800 mb-3">Photos can help preserve the visual details and make this memory even more vivid and meaningful.</p>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Upload className="w-4 h-4" />
                        Choose Photos
                      </button>
                    </div>
                  )}
                  
                  {/* Extraction Details */}
                  {showExtractionDetails && message.extraction && renderExtractionBadges(message.extraction)}
                </div>
                
                {/* Message Meta Info */}
                <div className={`text-xs flex items-center gap-2 px-2 ${
                  message.role === 'user' ? 'justify-end text-gray-500' : 'text-gray-400'
                }`}>
                  <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {message.memoryType && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      {message.memoryType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-gray-500 text-sm font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="space-y-3">
          {/* Voice Recording Button Row */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVoiceRecording}
              className={`p-3 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-200' 
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 hover:border-gray-400'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {/* Show Mic when ready to record, Square stop icon when recording */}
              {isRecording ? (
                <div className="w-6 h-6 bg-white rounded-sm"></div>
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
            
            {isRecording && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-6 bg-red-500 rounded animate-pulse"></div>
                  <div className="w-2 h-4 bg-red-400 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-8 bg-red-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-3 bg-red-400 rounded animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-6 bg-red-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-medium">Recording...</span>
                  <div className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </div>
                  {recordingDuration >= 50 && (
                    <span className="text-orange-600 text-xs font-medium">
                      {60 - recordingDuration}s left
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {isVoiceEnabled && !isRecording && (
              <div className="text-sm text-purple-600 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Voice chat enabled - AI will respond with voice
              </div>
            )}
          </div>

          {/* Enhanced Text Input Area */}
          <div className="relative">
            <textarea
              ref={(textarea) => {
                if (textarea) {
                  // Auto-resize textarea
                  textarea.style.height = 'auto'
                  const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 200)
                  textarea.style.height = newHeight + 'px'
                }
              }}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // Auto-resize
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                const newHeight = Math.min(Math.max(target.scrollHeight, 120), 200)
                target.style.height = newHeight + 'px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Tell me about your memory... Share as much detail as you'd like - describe the moment, how it felt, who was there, what you saw, heard, or experienced."
              className="w-full px-4 py-4 pr-16 border-2 border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 placeholder-gray-400 text-gray-900 bg-white shadow-sm text-base leading-relaxed overflow-y-auto"
              style={{ minHeight: '120px', maxHeight: '200px' }}
              disabled={isLoading || isRecording}
            />
            
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Error Display */}
          {recordingError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-red-800 text-sm font-medium">{recordingError}</span>
              </div>
            </div>
          )}

          {/* Helper Text */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>💡 Press Enter to send, Shift+Enter for new line</span>
              {input.length > 0 && (
                <span>{input.length} characters</span>
              )}
            </div>
            {input.length > 500 && (
              <span className="text-green-600 font-medium">Great detail! 👍</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}