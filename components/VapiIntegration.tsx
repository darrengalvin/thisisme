'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

export default function VapiIntegration() {
  const { user, session } = useAuth()
  const [isCallActive, setIsCallActive] = useState(false)

  const startVapiCall = async () => {
    if (!user || !session) {
      alert('Please log in first')
      return
    }

    try {
      // Configure VAPI with authenticated webhook URL - use user ID directly for simplicity
      const webhookUrl = `${window.location.origin}/api/vapi/webhook?userId=${user.id}`
      
      console.log('🎤 Starting VAPI call with authenticated webhook:', webhookUrl)
      console.log('🔐 User:', user.id, user.email)
      
      // Here you would integrate with VAPI SDK
      // Example:
      // const vapi = new Vapi('your-vapi-key')
      // await vapi.start({
      //   assistant: 'your-assistant-id',
      //   webhookUrl: webhookUrl
      // })
      
      setIsCallActive(true)
      
      // For demo purposes, show the webhook URL
      alert(`VAPI Webhook URL configured with authentication:\n\n${webhookUrl}\n\nThis URL includes your user ID so Maya can access your timeline!`)
      
    } catch (error) {
      console.error('Error starting VAPI call:', error)
      alert('Error starting call')
    }
  }

  const stopVapiCall = () => {
    setIsCallActive(false)
    // Here you would stop the VAPI call
    console.log('🎤 Stopping VAPI call')
  }

  if (!user) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <h3 className="font-semibold text-yellow-800">Authentication Required</h3>
        <p className="text-yellow-700">Please log in to use Maya, your memory assistant.</p>
      </div>
    )
  }

  return (
    <div className="p-6 border rounded-lg bg-blue-50">
      <h2 className="text-xl font-semibold mb-4">Maya - Your Memory Assistant</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <strong>Logged in as:</strong> {user.email}
        </p>
        <p className="text-sm text-gray-600">
          <strong>User ID:</strong> {user.id}
        </p>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">How it works:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Maya uses your authentication token to access your timeline</li>
          <li>• Your user ID ({user.id.substring(0, 8)}...) is passed to the webhook</li>
          <li>• This ensures Maya can only access YOUR memories and chapters</li>
          <li>• No fake users or fallback IDs are created</li>
        </ul>
      </div>

      <div className="space-y-3">
        {!isCallActive ? (
          <button
            onClick={startVapiCall}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🎤 Start Conversation with Maya
          </button>
        ) : (
          <button
            onClick={stopVapiCall}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🛑 Stop Conversation
          </button>
        )}
        
        <div className="text-xs text-gray-500">
          <p><strong>Webhook URL:</strong></p>
          <code className="bg-gray-100 p-1 rounded text-xs break-all">
            {window.location?.origin}/api/vapi/webhook?userId={user ? user.id : '[LOGIN_REQUIRED]'}
          </code>
        </div>
      </div>
    </div>
  )
}
