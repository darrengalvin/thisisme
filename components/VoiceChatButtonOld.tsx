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
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl text-white min-h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 flex items-center justify-center">
            {isCallActive && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
            {!isCallActive && !isLoading && (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Talk with Maya
            </h3>
            <p className="text-sm text-gray-300">
              {isCallActive ? 'Listening...' : vapiLoaded ? 'Click the microphone to start' : 'Loading voice system...'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {!isCallActive ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center mb-6 mx-auto transition-all duration-200 cursor-pointer" 
                 onClick={startVoiceChat}>
              <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-300 text-center mb-6">
              Click the microphone to begin a conversation
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center mb-6 mx-auto relative">
              <div className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-75"></div>
              <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-teal-300 text-center mb-6">
              Maya is listening...
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="mt-auto">
        {!isCallActive ? (
          <button
            onClick={startVoiceChat}
            disabled={isLoading || !vapiLoaded}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-xl hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 text-lg font-medium"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Starting...
              </>
            ) : !vapiLoaded ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Start
              </>
            )}
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="w-full bg-red-600 text-white py-4 rounded-xl hover:bg-red-700 flex items-center justify-center gap-3 transition-all duration-200 text-lg font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            End Call
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
        <div className="mt-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-white">Add Media to {lastCreatedItem.title}</h4>
            </div>
            <button
              onClick={() => setShowUploadWidget(false)}
              className="text-gray-400 hover:text-white text-lg transition-colors"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-gray-300 mb-3">
            Enhance your {lastCreatedItem.type} with photos and videos
          </p>
          
          <div className="space-y-3">
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
            
            <div className="grid grid-cols-2 gap-3">
              <label
                htmlFor="media-upload"
                className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 cursor-pointer text-sm transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Choose Files
              </label>
              
              <button
                onClick={() => setShowUploadWidget(false)}
                className="flex items-center justify-center gap-2 bg-gray-600 text-gray-200 px-4 py-3 rounded-lg hover:bg-gray-500 text-sm transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Later
              </button>
            </div>
            
            <p className="text-xs text-gray-400 text-center">
              Supports: JPG, PNG, GIF, MP4, MOV
            </p>
          </div>
        </div>
      )}

      {!vapiLoaded && (
        <div className="mt-4 p-3 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300">
          <strong>Note:</strong> Voice chat requires API configuration. Contact support if you're having issues.
        </div>
      )}
    </div>
  )
}
