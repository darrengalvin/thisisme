'use client'

import { useEffect } from 'react'
import TestAIChatInterface from '@/components/TestAIChatInterface'

export default function AITestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">AI Memory Assistant Test</h1>
        <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded">
          <p className="font-semibold">🧪 Test Mode</p>
          <p className="text-sm">This is a test version with no authentication required for AI testing.</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Click the 🔊 button to enable voice chat</li>
            <li>• Try typing or recording a memory</li>
            <li>• The AI should respond with contextual questions</li>
            <li>• Voice synthesis will work with Eleven Labs</li>
          </ul>
        </div>
        <TestAIChatInterface />
      </div>
    </div>
  )
}