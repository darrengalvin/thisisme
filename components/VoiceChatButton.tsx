'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

export default function VoiceChatButton() {
  const { user, session } = useAuth()
  const [isCallActive, setIsCallActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const startVoiceChat = async () => {
    if (!user || !session) {
      alert('Please log in first')
      return
    }

    setIsLoading(true)
    
    try {
      // Get auth token from session
      const token = session.access_token
      
      // Call our API to start the voice chat
      const response = await fetch('/api/vapi/start-call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to start voice chat')
      }

      const data = await response.json()
      console.log('🎤 Voice chat config:', data)

      // Here you would integrate with VAPI SDK
      // Example: const vapi = new Vapi('YOUR_VAPI_PUBLIC_KEY')
      // vapi.start(data.vapiConfig)
      
      // For now, we'll show what would happen
      alert(`Voice chat configured!\n\nMaya knows you as: ${data.user.name} (${data.user.email})\nAge: ${data.user.currentAge}\nBorn: ${data.user.birthYear}\n\nWebhook: ${data.instructions.webhookUrl}\n\nVAPI Config:\n${JSON.stringify(data.vapiConfig, null, 2)}\n\nGreeting: "${data.greeting}"`)
      
      setIsCallActive(true)

    } catch (error) {
      console.error('Error starting voice chat:', error)
      alert('Failed to start voice chat. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const stopVoiceChat = () => {
    setIsCallActive(false)
    // Here you would stop the VAPI call
    console.log('🎤 Stopping voice chat')
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
      <h3 className="text-lg font-semibold mb-3">Chat with Maya</h3>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <strong>Logged in as:</strong> {user.email}
        </p>
        <p className="text-sm text-gray-600">
          Maya will know it's you and can access your timeline!
        </p>
      </div>

      <div className="space-y-2">
        {!isCallActive ? (
          <button
            onClick={startVoiceChat}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Starting...
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
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            🛑 Stop Voice Chat
          </button>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Maya gets your user ID: {user.id.substring(0, 8)}...</li>
          <li>She can access your birth year, chapters, and memories</li>
          <li>Each user gets their own personalized experience</li>
        </ul>
      </div>
    </div>
  )
}
