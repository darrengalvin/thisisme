'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'

export default function VoiceChatButton() {
  const { user, session } = useAuth()
  const [isCallActive, setIsCallActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vapi, setVapi] = useState<any>(null)
  const [vapiLoaded, setVapiLoaded] = useState(false)
  const [conversationLog, setConversationLog] = useState<Array<{role: string, message: string, timestamp: string}>>([])
  const [showConversation, setShowConversation] = useState(false)

  // Load VAPI SDK
  useEffect(() => {
    const loadVapi = async () => {
      try {
        // Import VAPI SDK properly as an ES module
        const { default: Vapi } = await import('@vapi-ai/web')
        
        const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY || '')
        setVapi(vapiInstance)
        setVapiLoaded(true)
        
        console.log('🎤 VAPI SDK loaded successfully with key:', process.env.NEXT_PUBLIC_VAPI_API_KEY ? 'Present' : 'Missing')
        
        // Set up event listeners
        vapiInstance.on('call-start', () => {
          console.log('🎤 VAPI Call started')
          setIsCallActive(true)
          setConversationLog([])
        })
        
        vapiInstance.on('call-end', () => {
          console.log('🎤 VAPI Call ended')
          setIsCallActive(false)
        })
        
        vapiInstance.on('speech-start', () => {
          console.log('🎤 User started speaking')
        })
        
        vapiInstance.on('speech-end', () => {
          console.log('🎤 User finished speaking')
        })
        
        vapiInstance.on('message', (message: any) => {
          console.log('🎤 VAPI Message:', message)
          if (message?.type === 'transcript' && message?.transcript) {
            setConversationLog(prev => [...prev, {
              role: message.role === 'assistant' ? 'assistant' : 'user',
              message: message.transcript,
              timestamp: new Date().toLocaleTimeString()
            }])
          }
        })
        
        vapiInstance.on('error', (error: any) => {
          console.error('🎤 VAPI Error:', error)
          console.error('🎤 VAPI Error Details:', JSON.stringify(error, null, 2))
          setIsCallActive(false)
          setIsLoading(false)
        })
        
      } catch (error) {
        console.error('🎤 Failed to load VAPI SDK:', error)
        setVapiLoaded(false)
      }
    }

    loadVapi()
  }, [])

  const startVoiceChat = async () => {
    if (!user || !session) {
      alert('Please log in first')
      return
    }

    if (!vapi || !vapiLoaded) {
      alert('VAPI SDK is still loading. Please try again in a moment.')
      return
    }

    setIsLoading(true)
    
    try {
      // Get VAPI configuration
      const token = session.access_token
      
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      console.log('🔑 Using session token:', token ? `${token.substring(0, 20)}...` : 'None')
      console.log('🌐 Calling API endpoint:', '/api/vapi/start-call')
      
      const response = await fetch('/api/vapi/start-call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 API Response status:', response.status)
      console.log('📡 API Response ok:', response.ok)

      if (!response.ok) {
        throw new Error('Failed to get VAPI configuration')
      }

      const data = await response.json()
      console.log('🎤 Starting VAPI call with config:', data.vapiConfig)
      console.log('🎤 Assistant ID:', data.vapiConfig.assistantId)
      console.log('🎤 User ID:', data.vapiConfig.metadata.userId)
      
      // FIXED VAPI SDK CALL FORMAT
      // According to VAPI docs, we need to pass overrides directly as 2nd parameter
      console.log('🎤 🚀 USING CORRECT VAPI SDK FORMAT')
      console.log('🎤 📋 User ID to pass:', data.vapiConfig.metadata.userId)
      
      const callOptions = {
        variableValues: {
          userId: data.vapiConfig.metadata.userId,
          userEmail: data.vapiConfig.metadata.userEmail,
          userName: data.vapiConfig.metadata.userName,
          birthYear: data.vapiConfig.metadata.birthYear,
          currentAge: data.vapiConfig.metadata.currentAge
        }
      }
      
      console.log('🎤 ✅ CORRECT SDK CALL OPTIONS:', callOptions)
      await vapi.start(data.vapiConfig.assistantId, callOptions)
      console.log('🎤 ✅ VAPI CALL STARTED WITH CORRECT FORMAT!')
      
      console.log('🎤 ✅ VAPI CALL STARTED WITH USER ID!')
      console.log('🎤 📝 User ID passed directly:', data.vapiConfig.metadata.userId)
      console.log('🎤 🔍 Check webhook monitor to see if Maya receives user context')
      console.log('🎤 🤞 Maya should now have your user ID and be able to identify you')

      console.log('🎤 VAPI call started successfully!')
      console.log(`🎤 ✅ Maya should know you as: ${data.user.name} (born ${data.user.birthYear})`)
      console.log(`🎤 📋 User ID: ${data.vapiConfig.metadata.userId}`)

    } catch (error) {
      console.error('Error starting VAPI call:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to start voice chat: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  const stopVoiceChat = () => {
    if (vapi) {
      vapi.stop()
      console.log('🎤 VAPI call stopped')
    }
    setIsCallActive(false)
  }

  if (!user) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <p className="text-yellow-800">Please log in to chat with Maya</p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-semibold mb-3">Chat with Maya (Voice Assistant)</h3>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <strong>Logged in as:</strong> {user.email}
        </p>
        <p className="text-sm text-gray-600">
          Maya will know it's you and can access your timeline!
        </p>
        <p className="text-sm text-gray-500">
          <strong>VAPI Status:</strong> {vapiLoaded ? '✅ Ready' : '⏳ Loading SDK...'}
        </p>
      </div>

      <div className="space-y-2">
        {!isCallActive ? (
          <button
            onClick={startVoiceChat}
            disabled={isLoading || !vapiLoaded}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Starting VAPI Call...
              </>
            ) : !vapiLoaded ? (
              <>
                ⏳ Loading VAPI SDK...
              </>
            ) : (
              <>
                🎤 Start Voice Chat with Maya
              </>
            )}
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            🛑 End Voice Chat
          </button>
        )}
      </div>

      {/* Conversation Display */}
      {conversationLog.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">💬 Conversation</h4>
            <button
              onClick={() => setShowConversation(!showConversation)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showConversation ? 'Hide' : 'Show'} ({conversationLog.length})
            </button>
          </div>
          
          {showConversation && (
            <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-2 space-y-1">
              {conversationLog.map((entry, index) => (
                <div key={index} className={`text-xs p-2 rounded ${
                  entry.role === 'user' 
                    ? 'bg-blue-100 text-blue-800 ml-4' 
                    : 'bg-gray-100 text-gray-800 mr-4'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">
                      {entry.role === 'user' ? '👤 You' : '🤖 Maya'}:
                    </span>
                    <span className="text-gray-500 text-xs">{entry.timestamp}</span>
                  </div>
                  <div className="mt-1">{entry.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Maya gets your user ID: {user.id.substring(0, 8)}...</li>
          <li>She knows your birth year, chapters, and memories</li>
          <li>Try saying: "Do you know who I am?" or "What's my birth year?"</li>
          <li>Each user gets their own personalized experience</li>
        </ul>
      </div>

      {!vapiLoaded && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          <strong>Note:</strong> You'll need to add your VAPI Public Key to environment variables (NEXT_PUBLIC_VAPI_PUBLIC_KEY) for this to work.
        </div>
      )}
    </div>
  )
}
