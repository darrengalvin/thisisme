'use client'

import VAPIMemoryAssistant from '@/components/VAPIMemoryAssistant'

export default function VoiceMemoriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Voice Memory Capture
          </h1>
          <p className="text-gray-600">
            Share your memories naturally with Maya, your AI companion
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Assistant */}
          <div>
            <VAPIMemoryAssistant className="h-fit" />
          </div>

          {/* Instructions & Tips */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">How it works:</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span>Click "Start Memory Session" to begin</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span>Share any memory naturally - Maya will listen</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span>Maya will ask questions to capture rich details</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span>Your memories are automatically organized</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">💡 Try saying:</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-blue-50 rounded-lg p-3">
                  "I want to tell you about my wedding day..."
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  "Let me share a childhood memory..."
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  "I had this amazing vacation last year..."
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  "There's this person I want to remember..."
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h3 className="font-semibold text-green-800 mb-2">✨ Maya will help you:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Capture emotional details and context</li>
                <li>• Organize memories by timeline and themes</li>
                <li>• Ask meaningful follow-up questions</li>
                <li>• Connect related memories together</li>
                <li>• Preserve stories for future generations</li>
              </ul>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> Make sure NEXT_PUBLIC_VAPI_API_KEY is configured.
              <br />
              Assistant ID: 8ceaceba-6047-4965-92c5-225d0ebc1c4f
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
