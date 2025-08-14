'use client'

import ContinuousVoiceChat from '@/components/ContinuousVoiceChat'

export default function VoiceTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Continuous Voice Memory Assistant</h1>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Experience real-time voice conversation with your AI memory companion. Press the power button to start an open audio conversation - no need to click buttons between exchanges.
        </p>
        
        <div className="mb-6 p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 rounded">
          <p className="font-semibold">🎙️ Continuous Voice Mode</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Click power button to start open conversation</li>
            <li>• AI will greet you and then continuously listen</li>
            <li>• Speak naturally - AI will respond with voice automatically</li>
            <li>• Timeline-aware memory organization included</li>
            <li>• Uses Eleven Labs for natural AI voice responses</li>
          </ul>
        </div>
        
        <ContinuousVoiceChat />
      </div>
    </div>
  )
}