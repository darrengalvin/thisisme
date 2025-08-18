'use client'

import StreamingVoiceChat from '@/components/StreamingVoiceChat'
import VoiceDiagnosticPanel from '@/components/VoiceDiagnosticPanel'
import RealTimeVoiceTest from '@/components/RealTimeVoiceTest'
import WebRTCStreamingVoice from '@/components/WebRTCStreamingVoice'
import ComprehensiveAudioTest from '@/components/ComprehensiveAudioTest'

export default function StreamingVoicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            ⚡ Streaming Voice Memory Assistant
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            Real-time conversation with timeline-aware memory organization
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience truly seamless voice interaction: speak naturally, get instant responses, 
            and organize your memories with intelligent chapter placement and chronological awareness.
          </p>
        </div>
        
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 rounded-lg">
          <h3 className="font-bold text-green-800 text-lg mb-3">⚡ Streaming Technology Stack</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <strong>Speech Recognition:</strong> OpenAI Whisper streaming
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <strong>AI Brain:</strong> Claude Sonnet 4 with streaming responses
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                <strong>Voice Synthesis:</strong> ElevenLabs with priority streaming
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <strong>Audio Processing:</strong> 1.5-second chunks for low latency
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <strong>Memory Intelligence:</strong> Timeline-aware chapter organization
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                <strong>Real-time Processing:</strong> Overlapping transcription + generation
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
          <p className="font-semibold text-blue-800 mb-2">🎙️ How to Use Streaming Mode</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Click the Power button</strong> to start streaming conversation</li>
            <li>• <strong>Speak naturally</strong> - no need to pause or wait for prompts</li>
            <li>• <strong>Watch real-time transcription</strong> appear as you speak</li>
            <li>• <strong>AI responds immediately</strong> with timeline-aware questions</li>
            <li>• <strong>Conversation flows seamlessly</strong> like talking to a real person</li>
            <li>• <strong>Memory organization</strong> happens in real-time with chapter suggestions</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-purple-100 border border-purple-300 rounded-lg">
          <p className="font-semibold text-purple-800 mb-2">🧠 Timeline Intelligence Examples</p>
          <div className="text-sm text-purple-700 space-y-2">
            <div><strong>You:</strong> "I remember when I was about 7 years old..."</div>
            <div><strong>AI:</strong> "So around 1992 - that places you in your childhood chapter. What stands out most from that time?"</div>
            <div className="mt-3">
              <div><strong>You:</strong> "When I worked at BT, there was this one project..."</div>
              <div><strong>AI:</strong> "Ah, during your BT Telecommunications era from 2015-2020. What was the office culture like then?"</div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <ComprehensiveAudioTest />
        </div>
        
        <div className="mb-8">
          <VoiceDiagnosticPanel />
        </div>
        
        <div className="mb-8">
          <RealTimeVoiceTest />
        </div>
        
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg">
          <h3 className="font-bold text-blue-800 text-lg mb-3">🚀 NEW: WebRTC + GPT-4o Streaming Architecture</h3>
          <p className="text-blue-700 text-sm mb-4">
            This implements the recommended streaming architecture: WebRTC audio + GPT-4o streaming + OpenAI TTS. 
            Should eliminate the chunking issues we've been experiencing.
          </p>
          <WebRTCStreamingVoice />
        </div>
        


        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Powered by streaming AI • Real-time voice processing • Timeline-aware memory organization</p>
        </div>
      </div>
    </div>
  )
}