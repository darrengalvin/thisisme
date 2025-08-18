'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface VAPIMemoryAssistantProps {
  userId?: string
  className?: string
}

export default function VAPIMemoryAssistant({ userId, className = '' }: VAPIMemoryAssistantProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle')
  const [vapiInstance, setVapiInstance] = useState<any>(null)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)

  // Initialize VAPI when component mounts
  const initializeVAPI = async () => {
    try {
      const { default: Vapi } = await import('@vapi-ai/web')
      
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY || '')
      
      // Set up event listeners
      vapi.on('call-start', () => {
        console.log('🎤 VAPI: Call started')
        setCallStatus('connected')
        setIsCallActive(true)
      })
      
      vapi.on('call-end', () => {
        console.log('🎤 VAPI: Call ended')
        setCallStatus('ended')
        setIsCallActive(false)
        setIsUserSpeaking(false)
        setIsAISpeaking(false)
      })
      
      vapi.on('speech-start', () => {
        console.log('🎤 VAPI: User started speaking')
        setIsUserSpeaking(true)
        setIsAISpeaking(false)
      })
      
      vapi.on('speech-end', () => {
        console.log('🎤 VAPI: User stopped speaking')
        setIsUserSpeaking(false)
      })
      
      vapi.on('message', (message: any) => {
        console.log('💬 VAPI Message:', message)
        if (message.type === 'transcript' && message.role === 'assistant') {
          setIsAISpeaking(true)
          setIsUserSpeaking(false)
        }
      })
      
      vapi.on('error', (error: any) => {
        console.error('❌ VAPI Error:', error)
        setCallStatus('ended')
        setIsCallActive(false)
      })
      
      setVapiInstance(vapi)
      return vapi
      
    } catch (error) {
      console.error('Failed to initialize VAPI:', error)
      return null
    }
  }

  const startMemorySession = async () => {
    try {
      setCallStatus('connecting')
      
      let vapi = vapiInstance
      if (!vapi) {
        vapi = await initializeVAPI()
        if (!vapi) {
          alert('Failed to initialize voice assistant. Please check your configuration.')
          setCallStatus('idle')
          return
        }
      }

      // Use your configured assistant
      const assistantId = "8ceaceba-6047-4965-92c5-225d0ebc1c4f"
      
      // Add user context if available
      const assistantOptions = userId ? {
        assistantOverrides: {
          metadata: { userId }
        }
      } : {}
      
      await vapi.start(assistantId, assistantOptions)
      
    } catch (error) {
      console.error('Failed to start memory session:', error)
      setCallStatus('ended')
      alert('Failed to start memory session. Please try again.')
    }
  }

  const endMemorySession = async () => {
    if (vapiInstance) {
      vapiInstance.stop()
    }
    setCallStatus('ended')
    setIsCallActive(false)
    setIsUserSpeaking(false)
    setIsAISpeaking(false)
  }

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting': return 'text-yellow-600'
      case 'connected': return 'text-green-600'
      case 'ended': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = () => {
    if (isCallActive) {
      if (isUserSpeaking) return 'Listening to you...'
      if (isAISpeaking) return 'Maya is speaking...'
      return 'Ready to listen'
    }
    
    switch (callStatus) {
      case 'connecting': return 'Connecting to Maya...'
      case 'ended': return 'Session ended'
      default: return 'Ready to start'
    }
  }

  const getMicIcon = () => {
    if (isUserSpeaking) return <Mic className="animate-pulse text-red-500" size={24} />
    if (isAISpeaking) return <Volume2 className="animate-pulse text-blue-500" size={24} />
    return <Mic size={24} />
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          🎤 Voice Memory Assistant
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Talk to Maya about your memories
        </p>

        <div className={`text-sm font-medium mb-4 ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        
        {!isCallActive ? (
          <button
            onClick={startMemorySession}
            disabled={callStatus === 'connecting'}
            className="inline-flex items-center gap-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-md"
          >
            {getMicIcon()}
            {callStatus === 'connecting' ? 'Connecting...' : 'Start Memory Session'}
          </button>
        ) : (
          <button
            onClick={endMemorySession}
            className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-md"
          >
            <MicOff size={24} />
            End Session
          </button>
        )}

        {isCallActive && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 Speak naturally about any memory you'd like to capture
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
