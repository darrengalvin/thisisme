'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react'

export default function VAPITestPage() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle')
  const [vapiInstance, setVapiInstance] = useState<any>(null)

  // Initialize VAPI when component mounts
  const initializeVAPI = async () => {
    try {
      // Import VAPI SDK dynamically
      const { default: Vapi } = await import('@vapi-ai/web')
      
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY || 'your-vapi-key')
      
      // Set up event listeners
      vapi.on('call-start', () => {
        console.log('📞 VAPI: Call started')
        setCallStatus('connected')
        setIsCallActive(true)
      })
      
      vapi.on('call-end', () => {
        console.log('📞 VAPI: Call ended')
        setCallStatus('ended')
        setIsCallActive(false)
      })
      
      vapi.on('speech-start', () => {
        console.log('🎤 VAPI: User started speaking')
      })
      
      vapi.on('speech-end', () => {
        console.log('🎤 VAPI: User stopped speaking')
      })
      
      vapi.on('message', (message: any) => {
        console.log('💬 VAPI Message:', message)
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
      alert('Failed to initialize VAPI. Make sure you have the API key configured.')
    }
  }

  const startCall = async () => {
    try {
      setCallStatus('connecting')
      
      let vapi = vapiInstance
      if (!vapi) {
        vapi = await initializeVAPI()
        if (!vapi) return
      }

      // Use your existing VAPI assistant
      const assistantId = "8ceaceba-6047-4965-92c5-225d0ebc1c4f"
      
      await vapi.start(assistantId)
      
    } catch (error) {
      console.error('Failed to start call:', error)
      setCallStatus('ended')
      alert('Failed to start call. Check console for details.')
    }
  }

  const endCall = async () => {
    if (vapiInstance) {
      vapiInstance.stop()
    }
    setCallStatus('ended')
    setIsCallActive(false)
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
    switch (callStatus) {
      case 'connecting': return 'Connecting to Maya...'
      case 'connected': return 'Connected - Maya is listening'
      case 'ended': return 'Call ended'
      default: return 'Ready to connect'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎤 Maya - Memory Companion
            </h1>
            <p className="text-gray-600">
              Voice-powered memory capture with VAPI
            </p>
          </div>

          <div className="text-center mb-8">
            <div className={`text-lg font-medium mb-4 ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            
            {!isCallActive ? (
              <button
                onClick={startCall}
                disabled={callStatus === 'connecting'}
                className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-8 py-4 rounded-full text-lg font-medium transition-colors shadow-lg"
              >
                <Phone size={24} />
                {callStatus === 'connecting' ? 'Connecting...' : 'Start Memory Session'}
              </button>
            ) : (
              <button
                onClick={endCall}
                className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full text-lg font-medium transition-colors shadow-lg"
              >
                <PhoneOff size={24} />
                End Session
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">How to use Maya:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Click "Start Memory Session" to begin talking with Maya</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Share any memory - recent or from long ago</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Maya will ask questions to help capture rich details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Speak naturally - Maya understands conversational language</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Your memories will be organized in your timeline</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3">💡 Try saying:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3">
                "I want to tell you about my graduation day..."
              </div>
              <div className="bg-white rounded-lg p-3">
                "Let me share a memory about my grandmother..."
              </div>
              <div className="bg-white rounded-lg p-3">
                "I had this amazing trip last summer..."
              </div>
              <div className="bg-white rounded-lg p-3">
                "There's this childhood memory I cherish..."
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Development Mode:</strong> Make sure you have NEXT_PUBLIC_VAPI_API_KEY configured in your environment variables.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
