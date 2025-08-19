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
  const [showUploadWidget, setShowUploadWidget] = useState(false)
  const [lastCreatedItem, setLastCreatedItem] = useState<{type: 'chapter' | 'memory', title: string, id?: string} | null>(null)

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
            const transcript = message.transcript
            setConversationLog(prev => [...prev, {
              role: message.role === 'assistant' ? 'assistant' : 'user',
              message: transcript,
              timestamp: new Date().toLocaleTimeString()
            }])
            
            // Detect chapter/memory creation in Maya's responses
            if (message.role === 'assistant' && transcript) {
              if (transcript.includes("I've created") || transcript.includes("created your")) {
                if (transcript.toLowerCase().includes("chapter")) {
                  // Extract chapter title from response
                  const titleMatch = transcript.match(/created.*?"([^"]+)"/i) || transcript.match(/created.*?(\w+[\w\s]*)/i)
                  const title = titleMatch ? titleMatch[1] : 'your chapter'
                  setLastCreatedItem({type: 'chapter', title})
                  setShowUploadWidget(true)
                } else if (transcript.toLowerCase().includes("memory") || transcript.toLowerCase().includes("memor")) {
                  // Extract memory title from response  
                  const titleMatch = transcript.match(/created.*?"([^"]+)"/i) || transcript.match(/created.*?(\w+[\w\s]*)/i)
                  const title = titleMatch ? titleMatch[1] : 'your memory'
                  setLastCreatedItem({type: 'memory', title})
                  setShowUploadWidget(true)
                }
              }
              
              // Also show upload widget if Maya asks about images/media
              if (transcript.toLowerCase().includes("add a picture") || 
                  transcript.toLowerCase().includes("add any pictures") ||
                  transcript.toLowerCase().includes("upload") ||
                  transcript.toLowerCase().includes("add media") ||
                  transcript.toLowerCase().includes("add image")) {
                setShowUploadWidget(true)
              }
            }
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
          <strong>Voice Assistant:</strong> {vapiLoaded ? '✅ Ready' : '⏳ Loading...'}
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
                Starting Voice Chat...
              </>
            ) : !vapiLoaded ? (
              <>
                ⏳ Loading Voice System...
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

      {/* Upload Media Widget */}
      {showUploadWidget && lastCreatedItem && (
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📸</span>
              <h4 className="font-semibold text-purple-800">Add Media to {lastCreatedItem.title}</h4>
            </div>
            <button
              onClick={() => setShowUploadWidget(false)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-purple-700 mb-3">
            Enhance your {lastCreatedItem.type} with photos and videos!
          </p>
          
          <div className="space-y-2">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              id="media-upload"
              onChange={(e) => {
                // Handle file upload
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  console.log('🎤 Files selected for upload:', files)
                  // TODO: Implement actual upload logic
                  alert(`Selected ${files.length} file(s) for ${lastCreatedItem.title}. Upload functionality will be implemented next.`)
                  setShowUploadWidget(false)
                }
              }}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor="media-upload"
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 cursor-pointer text-sm transition-colors"
              >
                <span>📷</span>
                Choose Files
              </label>
              
              <button
                onClick={() => setShowUploadWidget(false)}
                className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-sm transition-colors"
              >
                <span>⏰</span>
                Later
              </button>
            </div>
            
            <p className="text-xs text-purple-600 text-center">
              Supports: JPG, PNG, GIF, MP4, MOV
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-800 mb-2">✨ What you can say to Maya:</p>
        <div className="space-y-2">
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="font-medium text-blue-800 text-sm">🏛️ Chapter Management</p>
            <p className="text-blue-600 mt-1">"Create a chapter for my university years from 1995 to 1999"</p>
            <p className="text-blue-600">"Add a chapter called 'My Career at Google' starting in 2010"</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-2">
            <p className="font-medium text-green-800 text-sm">💭 Memory Sharing</p>
            <p className="text-green-600 mt-1">"I want to tell you about my graduation day in 2003"</p>
            <p className="text-green-600">"Let me share a memory from my wedding in Spain"</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-2">
            <p className="font-medium text-purple-800 text-sm">🔍 Timeline Exploration</p>
            <p className="text-purple-600 mt-1">"What do you know about my timeline?"</p>
            <p className="text-purple-600">"Tell me about my memories from the 1990s"</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-2">
            <p className="font-medium text-orange-800 text-sm">❓ Getting Started</p>
            <p className="text-orange-600 mt-1">"Do you know who I am?" • "What's my birth year?"</p>
            <p className="text-orange-600">"How many chapters do I have?"</p>
          </div>
        </div>
        
        <p className="text-gray-500 mt-3 text-center italic">
          Maya knows your entire timeline and can help organize your life story naturally through conversation.
        </p>
      </div>

      {!vapiLoaded && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          <strong>Note:</strong> Voice chat requires API configuration. Contact support if you're having issues.
        </div>
      )}
    </div>
  )
}
