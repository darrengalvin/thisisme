'use client'

import VoiceChatButton from '@/components/VoiceChatButton'

export default function VapiTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          VAPI Voice Chat Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Maya Voice Assistant</h2>
          <p className="text-gray-600 mb-4">
            This page demonstrates the VAPI integration with proper user identification.
            When you start a voice chat, Maya will know exactly who you are and can access
            your timeline data.
          </p>
          
          <VoiceChatButton />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Make sure you're logged in to your account</li>
            <li>Click "Start Voice Chat with Maya" above</li>
            <li>Once connected, try saying:</li>
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li>"Do you know who I am?"</li>
              <li>"What's my birth year?"</li>
              <li>"How old am I?"</li>
              <li>"What chapters do I have?"</li>
              <li>"Tell me about my timeline"</li>
            </ul>
            <li>Maya should respond with your personal information!</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>Expected Response:</strong> "Hi [YourName]! I know you were born in [Year], 
            so you're currently [Age]. You have [X] memories in your timeline..."
          </div>
        </div>
      </div>
    </div>
  )
}