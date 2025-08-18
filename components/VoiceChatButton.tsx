'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'

// VAPI Web SDK types (you'll need to install @vapi-ai/web)
declare global {
  interface Window {
    Vapi: any;
  }
}

export default function VoiceChatButton() {
  const { user, session } = useAuth()
  const [isCallActive, setIsCallActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vapi, setVapi] = useState<any>(null)
  const [vapiLoaded, setVapiLoaded] = useState(false)

  // Load VAPI SDK
  useEffect(() => {
    const loadVapi = async () => {
      if (typeof window !== 'undefined' && !window.Vapi) {
        // Load VAPI SDK from CDN
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js'
        script.onload = () => {
          if (window.Vapi) {
            const vapiInstance = new window.Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || 'your-vapi-public-key')
            setVapi(vapiInstance)
            setVapiLoaded(true)
            
            // Set up event listeners
            vapiInstance.on('call-start', () => {
              console.log('🎤 VAPI Call started')
              setIsCallActive(true)
            })
            
            vapiInstance.on('call-end', () => {
              console.log('🎤 VAPI Call ended')
              setIsCallActive(false)
            })
            
            vapiInstance.on('error', (error: any) => {
              console.error('🎤 VAPI Error:', error)
              setIsCallActive(false)
              setIsLoading(false)
            })
          }
        }
        document.head.appendChild(script)
      } else if (window.Vapi && !vapi) {
        const vapiInstance = new window.Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || 'your-vapi-public-key')
        setVapi(vapiInstance)
        setVapiLoaded(true)
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
      // Get auth token from session
      const token = session.access_token
      
      // Call our API to get the VAPI configuration with user identification
      const response = await fetch('/api/vapi/start-call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get VAPI configuration')
      }

      const data = await response.json()
      console.log('🎤 Starting VAPI call with config:', data.vapiConfig)

      // Actually start the VAPI call with the user identification
      await vapi.start({
        ...data.vapiConfig,
        // Ensure the customer field is properly set for user identification
        customer: {
          userId: user.id,
          email: user.email,
          name: data.user.name,
          birthYear: data.user.birthYear,
          currentAge: data.user.currentAge
        }
      })

      console.log('🎤 VAPI call started successfully!')
      console.log(`🎤 Maya will know you as: ${data.user.name} (born ${data.user.birthYear})`)

    } catch (error) {
      console.error('Error starting VAPI call:', error)
      alert(`Failed to start voice chat: ${error.message}`)
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
