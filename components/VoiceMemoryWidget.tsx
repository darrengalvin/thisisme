'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Sparkles, MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react'

interface VoiceMemoryWidgetProps {
  onMemoryAdded?: (memory: any) => void
  onMemoryHighlight?: (memoryId: string) => void
  className?: string
}

export default function VoiceMemoryWidget({ 
  onMemoryAdded, 
  onMemoryHighlight,
  className = '' 
}: VoiceMemoryWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')
  const [recentMemories, setRecentMemories] = useState<string[]>([])
  const [showRecentMemories, setShowRecentMemories] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [vapiClient, setVapiClient] = useState<any>(null)
  const [transcript, setTranscript] = useState('')
  const [volumeLevel, setVolumeLevel] = useState(0)
  
  // Initialize VAPI client
  useEffect(() => {
    const initVapi = async () => {
      try {
        const Vapi = (await import('@vapi-ai/web')).default
        const client = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '')
        setVapiClient(client)
        
        // Set up event listeners
        client.on('call-start', () => {
          console.log('🎤 VAPI: Call started')
          setIsConnected(true)
          setConnectionStatus('connected')
        })
        
        client.on('call-end', () => {
          console.log('🎤 VAPI: Call ended')
          setIsConnected(false)
          setConnectionStatus('disconnected')
        })
        
        client.on('speech-start', () => {
          console.log('🎤 VAPI: User started speaking')
          setIsListening(true)
        })
        
        client.on('speech-end', () => {
          console.log('🎤 VAPI: User stopped speaking')
          setIsListening(false)
        })
        
        client.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcript) {
            setTranscript(message.transcript.text || '')
          }
          if (message.type === 'function-call' && message.functionCall) {
            console.log('🎤 VAPI: Function called:', message.functionCall)
          }
        })
        
        client.on('volume-level', (level: number) => {
          setVolumeLevel(level)
        })
        
      } catch (error) {
        console.error('🎤 VAPI: Failed to initialize:', error)
      }
    }
    
    initVapi()
  }, [])

  // Handle VAPI events
  useEffect(() => {
    if (transcript) {
      setLastTranscript(transcript)
    }
  }, [transcript])

  // Listen for function call responses to detect new memories
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'vapi-function-response') {
        const { response } = event.data
        if (response?.memoryId && response?.success) {
          console.log('🎤 VOICE WIDGET: New memory created via voice:', response.memoryId)
          handleMemoryCreated(response.memoryId)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onMemoryAdded, onMemoryHighlight])

  // Handle voice activity
  useEffect(() => {
    if (volumeLevel && volumeLevel > 0.1) {
      setIsListening(true)
    } else {
      setIsListening(false)
    }
  }, [volumeLevel])

  const handleToggleCall = async () => {
    if (!vapiClient) {
      console.error('🎤 VAPI client not initialized')
      return
    }
    
    try {
      if (isConnected) {
        await vapiClient.stop()
        setConnectionStatus('disconnected')
      } else {
        setConnectionStatus('connecting')
        await vapiClient.start({
          assistantId: '8ceaceba-6047-4965-92c5-225d0ebc1c4f' // Your VAPI assistant ID
        })
      }
    } catch (error) {
      console.error('🎤 Error toggling call:', error)
      setConnectionStatus('disconnected')
    }
  }

  const handleMemoryCreated = (memoryId: string) => {
    // Add to recent memories for highlighting
    setRecentMemories(prev => [memoryId, ...prev.slice(0, 4)]) // Keep last 5
    
    // Trigger highlight in parent component
    onMemoryHighlight?.(memoryId)
    
    // Show recent memories panel briefly
    setShowRecentMemories(true)
    setTimeout(() => setShowRecentMemories(false), 3000)
    
    // Notify parent of new memory
    onMemoryAdded?.({ id: memoryId })
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return isListening ? 'from-green-500 to-emerald-500' : 'from-blue-500 to-purple-500'
      case 'connecting': return 'from-yellow-500 to-orange-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getStatusText = () => {
    if (connectionStatus === 'connected') {
      return isListening ? 'Listening...' : 'Ready to chat'
    }
    if (connectionStatus === 'connecting') {
      return 'Connecting...'
    }
    return 'Tap to start'
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {/* Floating Voice Bubble */}
        <div className="relative">
          {/* Recent memories indicator */}
          {recentMemories.length > 0 && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              {recentMemories.length}
            </div>
          )}
          
          {/* Main voice button */}
          <button
            onClick={handleToggleCall}
            className={`w-16 h-16 rounded-full bg-gradient-to-r ${getStatusColor()} text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center relative overflow-hidden group`}
          >
            {/* Animated background pulse */}
            {isListening && (
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
            )}
            
            {/* Icon */}
            {connectionStatus === 'connecting' ? (
              <div className="animate-spin">
                <Sparkles size={24} />
              </div>
            ) : isSessionActive ? (
              isListening ? <Volume2 size={24} /> : <MessageCircle size={24} />
            ) : (
              <Mic size={24} />
            )}
            
            {/* Voice level indicator */}
            {isListening && volumeLevel && (
              <div 
                className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/60 rounded-full overflow-hidden"
              >
                <div 
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                />
              </div>
            )}
          </button>
          
          {/* Expand button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="absolute -top-2 -right-2 w-8 h-8 bg-white text-gray-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-xs hover:bg-gray-50"
          >
            <Maximize2 size={14} />
          </button>
          
          {/* Status tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {getStatusText()}
          </div>
        </div>
        
        {/* Recent memories popup */}
        {showRecentMemories && recentMemories.length > 0 && (
          <div className="absolute bottom-full right-0 mb-4 bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[250px] animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={16} className="text-green-500" />
                New Memories Added
              </h3>
              <button
                onClick={() => setShowRecentMemories(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {recentMemories.length} memor{recentMemories.length !== 1 ? 'ies' : 'y'} captured via voice
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-1">
                {recentMemories.slice(0, 3).map((_, index) => (
                  <div key={index} className="w-6 h-6 bg-green-100 border-2 border-white rounded-full flex items-center justify-center">
                    <span className="text-xs text-green-600">✓</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-500">Added to timeline</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Expanded Voice Chat Interface */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 h-96 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getStatusColor()} text-white p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              )}
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Maya - Voice Memory</h3>
              <p className="text-xs text-white/80">{getStatusText()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <Minimize2 size={12} />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {!isConnected ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic size={24} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Start Voice Chat</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share your memories naturally with Maya. She'll help organize them on your timeline.
              </p>
              <button
                onClick={handleToggleCall}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-200"
              >
                Start Conversation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection status */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                  isListening ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isListening ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                  }`} />
                  {isListening ? 'Listening to you...' : 'Maya is ready'}
                </div>
              </div>
              
              {/* Last transcript */}
              {lastTranscript && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-blue-600">You:</span> {lastTranscript}
                  </p>
                </div>
              )}
              
              {/* Recent memories indicator */}
              {recentMemories.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {recentMemories.length} New Memories Added
                    </span>
                  </div>
                  <p className="text-xs text-green-600">
                    Your memories have been saved to your timeline and are highlighted.
                  </p>
                </div>
              )}
              
              {/* Voice level indicator */}
              {isListening && volumeLevel && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Volume2 size={16} className="text-green-500" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-100"
                        style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleToggleCall}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg text-white'
              }`}
            >
              {isConnected ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            {isConnected ? 'Tap to end conversation' : 'Tap to start voice chat'}
          </p>
        </div>
      </div>
    </div>
  )
}
