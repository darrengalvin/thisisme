'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import UpgradeModal from './UpgradeModal'

interface VoiceChatButtonProps {
  onDataChange?: () => void
  onChapterUpdate?: (chapterName: string) => void
  onMemoryUpdate?: (memoryId: string, chapterName?: string) => void
}

export default function VoiceChatButton({ onDataChange, onChapterUpdate, onMemoryUpdate }: VoiceChatButtonProps = {}) {
  const { user, session } = useAuth()
  const [isCallActive, setIsCallActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vapi, setVapi] = useState<any>(null)
  const [vapiLoaded, setVapiLoaded] = useState(false)
  const [conversationLog, setConversationLog] = useState<Array<{role: string, message: string, timestamp: string}>>(() => {
    // Load conversation log from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maya-conversation-log')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.error('Failed to parse saved conversation log:', error)
        }
      }
    }
    return []
  })
  const [showConversation, setShowConversation] = useState(() => {
    // Load conversation visibility from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maya-show-conversation')
      return saved === 'true'
    }
    return false
  })
  const [showUploadWidget, setShowUploadWidget] = useState(false)
  const [lastCreatedItem, setLastCreatedItem] = useState<{type: 'chapter' | 'memory', title: string, id?: string} | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showMayaInterface, setShowMayaInterface] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maya-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [position, setPosition] = useState(() => {
    // Load position from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maya-position')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.error('Failed to parse saved Maya position:', error)
        }
      }
    }
    return { x: typeof window !== 'undefined' ? window.innerWidth - 400 : 100, y: 80 } // Default: top-right
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('maya-collapsed', isCollapsed.toString())
  }, [isCollapsed])

  useEffect(() => {
    localStorage.setItem('maya-conversation-log', JSON.stringify(conversationLog))
  }, [conversationLog])

  useEffect(() => {
    localStorage.setItem('maya-show-conversation', showConversation.toString())
  }, [showConversation])

  useEffect(() => {
    localStorage.setItem('maya-position', JSON.stringify(position))
  }, [position])

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x))
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
    
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  // Check premium status
  const checkPremiumStatus = async () => {
    console.log('🔄 MAYA: Starting premium status check...')
    
    if (!user) {
      console.log('❌ MAYA: No user found, cannot check premium status')
      setPremiumLoading(false)
      return
    }

    console.log('👤 MAYA: Checking premium status for user:', user.id, user.email)
    setPremiumLoading(true)
    
    try {
      console.log('📡 MAYA: Getting auth token for premium status check...')
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ MAYA: Failed to get auth token for premium check')
        throw new Error('Failed to get auth token')
      }

      const { token } = await tokenResponse.json()
      console.log('✅ MAYA: Got auth token for premium check')

      console.log('📡 MAYA: Calling /api/user/premium-status with JWT token...')
      const response = await fetch('/api/user/premium-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('📊 MAYA: Premium status response:', response.status, response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 MAYA: Premium status data:', data)
        setIsPremiumUser(data.isPremium)
        console.log('🔄 MAYA: Premium status updated:', data.isPremium)
      } else {
        console.error('❌ MAYA: Premium status check failed:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ MAYA: Error details:', errorData)
      }
    } catch (error) {
      console.error('❌ MAYA: Failed to check premium status:', error)
    } finally {
      setPremiumLoading(false)
      console.log('✅ MAYA: Premium status check completed')
    }
  }

  useEffect(() => {
    checkPremiumStatus()
  }, [user, session])

  // Load conversation history
  const loadConversationHistory = async () => {
    if (!user || !session) return
    
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversationHistory(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

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
                  // Trigger data refresh when Maya creates a chapter
                  console.log('🔄 Maya created chapter - triggering refresh')
                  onDataChange?.()
                  // Trigger chapter visual feedback
                  onChapterUpdate?.(title)
                } else if (transcript.toLowerCase().includes("memory") || transcript.toLowerCase().includes("memor")) {
                  // Extract memory title from response  
                  const titleMatch = transcript.match(/created.*?"([^"]+)"/i) || transcript.match(/created.*?(\w+[\w\s]*)/i)
                  const title = titleMatch ? titleMatch[1] : 'your memory'
                  setLastCreatedItem({type: 'memory', title})
                  setShowUploadWidget(true)
                  // Trigger data refresh when Maya creates a memory
                  console.log('🔄 Maya created memory - triggering refresh')
                  onDataChange?.()
                  // Trigger memory visual feedback - extract chapter if mentioned
                  const chapterMatch = transcript.match(/(?:to your|in your|saved to)\s+([^.]+?)\s+chapter/i)
                  const chapterName = chapterMatch ? chapterMatch[1].trim() : undefined
                  onMemoryUpdate?.(title, chapterName)
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

    if (!isPremiumUser) {
      setShowUpgradeModal(true)
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
      <div className="card p-6 bg-amber-50 border-amber-200">
        <p className="text-amber-800">Please log in to chat with Maya</p>
      </div>
    )
  }

  if (premiumLoading) {
    return (
      <div className="card p-6 bg-slate-50">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full mr-3"></div>
          <span className="text-slate-600">Loading Maya...</span>
        </div>
      </div>
    )
  }

  if (!isPremiumUser) {
    return (
      <>
        {/* Small Toggle Button for Non-Premium */}
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="w-14 h-14 bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group relative"
          title="Maya - AI Memory Assistant (Premium)"
        >
          {/* Premium Badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            ★
          </div>
          
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgradeSuccess={() => {
            console.log('🎉 MAYA: Premium upgrade successful, refreshing status...')
            checkPremiumStatus()
          }}
        />
      </>
    )
  }

  return (
    <>
      {/* Small Toggle Button for Premium Users */}
      <button
        onClick={() => setShowMayaInterface(true)}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group relative ${
          isCallActive 
            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
        }`}
        title={isCallActive ? "Maya is listening..." : "Talk with Maya"}
      >
        {/* Active Call Indicator */}
        {isCallActive && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        )}
        
        <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Maya Interface - Draggable Floating Panel */}
      {showMayaInterface && (
        <>
          {/* Subtle backdrop - click to close */}
          <div 
            className="fixed inset-0 bg-black/5 z-30" 
            onClick={() => setShowMayaInterface(false)}
          />
          
          {/* Draggable Floating Panel */}
          <div 
            className={`fixed z-40 shadow-2xl transition-all duration-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-auto'
            } ${isCollapsed ? 'w-80' : 'w-96'}`}
            style={{
              left: position.x,
              top: position.y,
              maxHeight: isCollapsed ? '120px' : 'calc(100vh - 100px)',
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full h-full overflow-hidden border border-gray-200/50 backdrop-blur-sm">
            <div className={`card-elevated flex flex-col bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 transition-all duration-300 ${
              isCollapsed ? 'min-h-0' : 'min-h-[500px]'
            }`}>
      {/* Draggable Header */}
      <div 
        className={`${isCollapsed ? 'p-3' : 'p-4'} bg-gradient-to-r from-blue-600 to-indigo-700 text-white transition-all duration-300 ${
          isCollapsed ? 'rounded-xl' : 'rounded-t-xl'
        } cursor-grab active:cursor-grabbing select-none`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isCallActive) {
                  endCall()
                } else {
                  startCall()
                }
              }}
              disabled={!vapiLoaded || isLoading}
              className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-all duration-200 ${
                vapiLoaded && !isLoading ? 'hover:bg-white/30 hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
              title={isCallActive ? "End conversation" : "Start talking to Maya"}
            >
              {isCallActive && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                </div>
              )}
              {!isCallActive && !isLoading && (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-white truncate ${isCollapsed ? 'text-sm' : 'text-lg'}`}>
                {isCollapsed ? 'Maya' : 'Talk with Maya'}
              </h3>
              {!isCollapsed && (
                <p className="text-xs text-blue-100 truncate">
                  {isCallActive ? 'Listening...' : vapiLoaded ? 'Ready to chat' : 'Loading...'}
                </p>
              )}
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Collapse/Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed(!isCollapsed)
              }}
              className={`${isCollapsed ? 'w-6 h-6' : 'w-7 h-7'} flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all`}
              title={isCollapsed ? "Expand Maya" : "Minimize Maya"}
            >
              <svg className={`${isCollapsed ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d={isCollapsed 
                  ? "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  : "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                } clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMayaInterface(false)
              }}
              className={`${isCollapsed ? 'w-6 h-6' : 'w-7 h-7'} flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all`}
              title="Close Maya"
            >
              <svg className={`${isCollapsed ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!isCollapsed && (
        <>
        <div className="flex-1 p-6">
        {!isCallActive ? (
          <div className="flex flex-col h-full">
            {/* Conversation History */}
            {showHistory && (
              <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-blue-800">Recent Conversations</h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
                
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-blue-600 mt-2">Loading conversations...</p>
                  </div>
                ) : conversationHistory.length > 0 ? (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {conversationHistory.slice(0, 5).map((conversation) => (
                      <div
                        key={conversation.id}
                        className="bg-white rounded-lg p-3 border border-blue-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600 font-medium">
                            {new Date(conversation.startedAt).toLocaleDateString()} {new Date(conversation.startedAt).toLocaleTimeString()}
                          </span>
                          {conversation.duration && (
                            <span className="text-xs text-gray-500">
                              {Math.round(conversation.duration / 60)}m
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {conversation.messages.length > 0 
                            ? conversation.messages[0].content.substring(0, 100) + '...'
                            : 'No messages recorded'
                          }
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {conversation.messages.length} messages
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-blue-600 text-center py-4">
                    No conversations yet. Start your first chat with Maya!
                  </p>
                )}
              </div>
            )}
            
            {/* Sample conversation starters */}
            {!showHistory && (
              <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">💬 Try saying:</h4>
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                  "Tell me about my childhood memories"
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-800">
                  "I want to save a memory from last summer"
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-sm text-cyan-800">
                  "Create a new chapter for my college years"
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sm text-sky-800">
                  "What memories do I have from 2020?"
                </div>
              </div>
              </div>
            )}
            
            {/* Start button */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center mb-4 mx-auto transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105" 
                   onClick={startVoiceChat}>
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-600 text-center text-sm">
                Click to start your conversation with Maya
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Active conversation area */}
            <div className="flex-1 flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className="text-center">
                <p className="text-blue-700 font-semibold mb-2">
                  Maya is listening...
                </p>
                <p className="text-gray-600 text-sm">
                  Share your memories naturally
                </p>
              </div>
            </div>
            
            {/* Live conversation display */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200 p-4 h-[150px] overflow-y-auto">
              {conversationLog.length > 0 ? (
                <div className="space-y-3">
                  {conversationLog.slice(-3).map((entry, index) => (
                    <div key={index} className={`text-sm p-3 rounded-lg ${
                      entry.role === 'user' 
                        ? 'bg-blue-100 text-blue-800 ml-6' 
                        : 'bg-indigo-100 text-indigo-800 mr-6'
                    }`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs">
                          {entry.role === 'user' ? '👤 You' : '🤖 Maya'}:
                        </span>
                        <span className="text-xs opacity-60">{entry.timestamp}</span>
                      </div>
                      <div>{entry.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Your conversation will appear here...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="p-6 pt-0">
        {!isCallActive ? (
          <button
            onClick={startVoiceChat}
            disabled={isLoading || !vapiLoaded}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-xl hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                Starting...
              </>
            ) : !vapiLoaded ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 0 1 6 0v4a3 3 0 1 1-6 0V4zm4 10.93A7.001 7.001 0 0 0 17 8a1 1 0 1 0-2 0A5 5 0 0 1 5 8a1 1 0 0 0-2 0 7.001 7.001 0 0 0 6 6.93V17H6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Start Conversation
              </>
            )}
          </button>
        ) : (
          <button
            onClick={stopVoiceChat}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl hover:from-red-600 hover:to-red-700 flex items-center justify-center gap-3 transition-all duration-200 text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            End Conversation
          </button>
        )}
      </div>

      {/* Upload Media Widget */}
      {showUploadWidget && lastCreatedItem && (
        <div className="m-6 mt-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-blue-800">Add Media to {lastCreatedItem.title}</h4>
            </div>
            <button
              onClick={() => setShowUploadWidget(false)}
              className="text-blue-600 hover:text-blue-800 text-lg transition-colors"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-blue-700 mb-3">
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
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 cursor-pointer text-sm transition-colors font-medium"
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
            
            <p className="text-xs text-blue-600 text-center">
              Supports: JPG, PNG, GIF, MP4, MOV
            </p>
          </div>
        </div>
      )}
      
        {!vapiLoaded && (
          <div className="m-6 mt-0 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Note:</strong> Voice chat requires API configuration. Contact support if you're having issues.
          </div>
        )}
        </>
      )}
      
      {!vapiLoaded && isCollapsed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Note:</strong> Voice chat requires API configuration. Contact support if you're having issues.
        </div>
      )}
            </div>
          </div>
        </div>
        </>
      )}
    </>
  )
}