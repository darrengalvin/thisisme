'use client'

import { useState } from 'react'
import { 
  Brain, FileText, Code, Database, GitBranch, Terminal, AlertTriangle,
  Folder, ChevronRight, ChevronDown, Copy, Check, Mic, Volume2, 
  Zap, Bug, Settings, Monitor, Activity
} from 'lucide-react'

export default function AITechnicalReportPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['executive-summary'])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const currentImplementations = [
    {
      component: 'WebRTCStreamingVoice.tsx',
      location: '/components/WebRTCStreamingVoice.tsx',
      purpose: 'CURRENT WORKING: Fully automatic WebRTC voice conversation',
      status: 'PRODUCTION (Performance Optimization Needed)',
      features: [
        'ScriptProcessorNode for real-time audio capture (4096 buffer)',
        '1.5-second audio chunks (24 chunks) for transcription',
        'Automatic silence detection (1.5s threshold)',
        'Auto-resume listening after AI speech (no manual buttons)',
        'Clean UI with optional debug panel',
        'Copyable text messages',
        'Complete conversation flow automation',
        'WebRTC audio settings: 16kHz, mono, echo cancellation'
      ]
    },
    {
      component: 'ComprehensiveAudioTest.tsx',
      location: '/components/ComprehensiveAudioTest.tsx',
      purpose: 'Testing interface for audio system diagnostics',
      status: 'Active - Debugging Tool',
      features: [
        'Individual component testing',
        'Real-time volume monitoring',
        'End-to-end pipeline testing',
        'API status monitoring',
        'Audio chunk analysis'
      ]
    },
    {
      component: 'StreamingVoiceChat.tsx',
      location: '/components/StreamingVoiceChat.tsx', 
      purpose: 'Legacy MediaRecorder implementation (timing issues)',
      status: 'Legacy - Has Timing Problems',
      features: [
        'MediaRecorder-based audio capture',
        'Manual button controls',
        'Complex debug panels',
        'Known timing and sync issues'
      ]
    }
  ]

  const apiEndpoints = [
    {
      endpoint: '/api/ai/whisper-streaming',
      method: 'POST',
      status: 'WORKING - Performance Critical',
      purpose: 'Current Whisper transcription (optimized for streaming)',
      lastUpdated: '2025-08-14',
      keyFeatures: [
        'No prompt parameter (prevents hallucinations)',
        'Light hallucination filtering for streaming',
        'Fast processing optimized for real-time',
        'Handles WAV blob input from WebRTC',
        'Temperature 0.0 for consistency'
      ],
      request: `FormData: {
  audio: Blob (audio/wav) // WAV format from WebRTC
}`,
      response: `{
  "success": true/false,
  "transcription": "user speech text",
  "confidence": 0.95,
  "isPartial": true/false
}`
    },
    {
      endpoint: '/api/ai/gpt4o-streaming',
      method: 'POST', 
      status: 'WORKING - SLOW PERFORMANCE',
      purpose: 'GPT-4o streaming conversation (main bottleneck)',
      lastUpdated: '2025-08-14',
      keyFeatures: [
        'Server-sent events streaming',
        'GPT-4o-mini model for speed',
        'Conversational system prompt',
        'Last 10 messages context',
        'Real-time response streaming'
      ],
      request: `{
  "message": "user input text",
  "conversationHistory": [...] // Last 10 messages
}`,
      response: `Server-Sent Events:
data: {"content": "response chunk"}
data: {"done": true}`
    },
    {
      endpoint: '/api/ai/tts-streaming',
      method: 'POST',
      status: 'WORKING - ElevenLabs Priority',
      purpose: 'Voice synthesis with ElevenLabs priority',
      lastUpdated: '2025-08-14',
      keyFeatures: [
        'ElevenLabs API first (Rachel voice)',
        'OpenAI TTS fallback',
        'Optimized voice settings',
        'Audio blob response'
      ],
      request: `{
  "text": "AI response to synthesize"
}`,
      response: `Audio Blob (audio/mpeg)`
    },
  ]

  const challengesAndSolutions = [
    {
      challenge: "Conversation Response Time Too Slow",
      description: "Total response time of 3-5 seconds makes conversation feel unnatural",
      rootCause: "Multiple bottlenecks: 1.5s audio chunks + 800ms silence delay + GPT-4o processing + TTS generation",
      solution: "NEEDS OPTIMIZATION - Multiple approaches possible",
      status: "CRITICAL - Performance Issue",
      codeChanges: [
        "Current: 24 chunks (1.5s) before processing",
        "Current: 800ms delay after silence detection",
        "Current: Sequential processing (not parallel)",
        "OPTIMIZATION NEEDED: Reduce chunk size or parallelize"
      ]
    },
    {
      challenge: "Fixed Silence Detection Timing",
      description: "System waits exactly 1.5 seconds of silence before processing, creating artificial delay",
      rootCause: "Hard-coded 22 chunk limit (1.5s) before sending to AI",
      solution: "Could implement dynamic silence detection or streaming transcription",
      status: "Performance Bottleneck",
      codeChanges: [
        "Current: if (silenceCountRef.current > 22) trigger processing",
        "COULD OPTIMIZE: Dynamic silence detection",
        "COULD OPTIMIZE: Start processing earlier with partial transcripts"
      ]
    },
    {
      challenge: "GPT-4o Streaming Not Optimized",
      description: "GPT-4o responses take significant time to generate and stream",
      rootCause: "Using gpt-4o-mini with standard settings, not optimized for voice chat",
      solution: "Optimize model settings, prompt, or consider faster alternatives",
      status: "Performance Bottleneck",
      codeChanges: [
        "Current: gpt-4o-mini with max_tokens: 500, temperature: 0.7",
        "COULD OPTIMIZE: Reduce max_tokens for voice responses",
        "COULD OPTIMIZE: Adjust temperature for faster generation",
        "COULD OPTIMIZE: Consider gpt-3.5-turbo for speed"
      ]
    },
    {
      challenge: "Audio Processing Not Parallel",
      description: "Audio chunks processed sequentially, not taking advantage of overlapping",
      rootCause: "Current implementation waits for full silence before any processing",
      solution: "Implement parallel processing of audio chunks as they arrive",
      status: "Optimization Opportunity",
      codeChanges: [
        "Current: Collect 24 chunks, then process all at once",
        "COULD OPTIMIZE: Process chunks as they arrive",
        "COULD OPTIMIZE: Start Whisper transcription on partial audio"
      ]
    },
    {
      challenge: "Manual Button Press Required (SOLVED)",
      description: "User had to manually press 'Start Listening' after each AI response",
      rootCause: "Audio processing not automatically resuming after AI speech",
      solution: "Implemented automatic listening resumption",
      status: "RESOLVED ✅",
      codeChanges: [
        "Added auto-resume in audio.onended callback",
        "Removed manual button requirement",
        "500ms delay to prevent audio overlap"
      ]
    },
    {
      challenge: "AI Feedback Loop (SOLVED)",
      description: "AI was hearing its own speech and getting confused",
      rootCause: "Microphone was active while AI was speaking",
      solution: "Pause microphone during AI speech",
      status: "RESOLVED ✅",
      codeChanges: [
        "isAISpeaking state management",
        "Pause recording during TTS playback",
        "Clean state transitions between listening/speaking"
      ]
    },
    {
      challenge: "Transcription Accuracy (SOLVED)",
      description: "System was getting phantom transcriptions or missing real speech",
      rootCause: "Multiple issues with audio processing and state management",
      solution: "Fixed with proper WebRTC implementation and state refs",
      status: "RESOLVED ✅",
      codeChanges: [
        "Switched to WebRTC ScriptProcessorNode",
        "Fixed stale closure issues with refs",
        "Proper audio chunk processing"
      ]
    }
  ]

  const streamingArchitecture = `
🔄 CURRENT WORKING WEBRTC ARCHITECTURE (Performance Analysis Needed)

📊 PERFORMANCE BREAKDOWN (Current Timings):
   Total Response Time: 3-5 seconds
   ├── Audio Capture: 1.5s (24 chunks at 4096 samples)
   ├── Silence Detection: 800ms delay
   ├── Whisper Processing: ~500ms
   ├── GPT-4o Streaming: ~1-2s
   └── TTS Generation: ~500ms

1. AUDIO CAPTURE (WebRTC Implementation)
   ├── ScriptProcessorNode (4096 buffer size)
   ├── 16kHz sample rate, mono, echo cancellation
   ├── Real-time audio chunks (Float32Array)
   ├── Process every 24 chunks (1.5 seconds)
   └── Silence detection (22 chunk threshold)

2. SPEECH PROCESSING (Whisper API)
   ├── /api/ai/whisper-streaming
   ├── WAV blob conversion from Float32Array
   ├── OpenAI Whisper-1 model
   ├── No prompt parameter
   └── Light hallucination filtering

3. AI CONVERSATION (GPT-4o Streaming) **MAIN BOTTLENECK**
   ├── /api/ai/gpt4o-streaming
   ├── GPT-4o-mini model
   ├── Server-sent events streaming
   ├── Max tokens: 500, Temperature: 0.7
   └── Last 10 messages context

4. VOICE SYNTHESIS (ElevenLabs)
   ├── /api/ai/tts-streaming
   ├── ElevenLabs Rachel voice (priority)
   ├── OpenAI TTS fallback
   └── Audio blob response

5. AUTOMATION & STATE MANAGEMENT ✅
   ├── Auto-resume listening after AI speech
   ├── Pause microphone during TTS
   ├── Clean conversation flow
   ├── No manual button pressing required
   └── Proper state management with refs

⚡ OPTIMIZATION OPPORTUNITIES:
   • Reduce audio chunk size (24→12 chunks = 750ms)
   • Parallel audio processing
   • Optimize GPT-4o settings for voice
   • Dynamic silence detection
   • Streaming transcription (don't wait for silence)
   • Pre-load TTS for common responses
`

  const fileStructure = `
📁 CURRENT WEBRTC IMPLEMENTATION FILE STRUCTURE

/thisisme/
├── app/
│   ├── ai-features/
│   │   └── page.tsx                     # This performance analysis report
│   ├── streaming-voice/
│   │   └── page.tsx                     # Main WebRTC interface (WORKING)
│   └── api/
│       └── ai/
│           ├── whisper-streaming/
│           │   └── route.ts             # ✅ CURRENT: Optimized Whisper
│           ├── gpt4o-streaming/
│           │   └── route.ts             # 🐌 BOTTLENECK: GPT-4o streaming
│           ├── tts-streaming/
│           │   └── route.ts             # ✅ WORKING: ElevenLabs TTS
│           ├── [LEGACY ENDPOINTS]
│           ├── streaming-speech-to-text/
│           ├── streaming-memory-assistant/
│           └── voice-synthesis-test/
├── components/
│   ├── WebRTCStreamingVoice.tsx         # 🎯 MAIN COMPONENT (Performance critical)
│   ├── ComprehensiveAudioTest.tsx       # Testing diagnostics
│   ├── [LEGACY COMPONENTS]
│   ├── StreamingVoiceChat.tsx           # Old MediaRecorder version
│   ├── VoiceDiagnosticPanel.tsx         # Legacy diagnostics
│   └── ContinuousVoiceChat.tsx          # Legacy 3-second chunks
├── lib/
│   └── ai/
│       ├── claude-client.ts             # Not used in current implementation
│       └── voice-client.ts              # ElevenLabs client

🎯 PERFORMANCE CRITICAL FILES:
   • /components/WebRTCStreamingVoice.tsx (main component)
   • /api/ai/gpt4o-streaming/route.ts (main bottleneck)
   • /api/ai/whisper-streaming/route.ts (audio processing)
   • /api/ai/tts-streaming/route.ts (voice synthesis)
`

  const debuggingCapabilities = [
    {
      feature: "Real-time Audio Stats",
      description: "Shows captured audio size, type, and duration",
      location: "VoiceDiagnosticPanel + StreamingVoiceChat debug panel"
    },
    {
      feature: "Transcription History",
      description: "Complete log of all transcription attempts with filter status",
      location: "VoiceDiagnosticPanel transcription history"
    },
    {
      feature: "Hallucination Detection",
      description: "Visual indicators when text is filtered as hallucination",
      location: "Console logs + UI status messages"
    },
    {
      feature: "Audio Feedback Monitoring",
      description: "Shows when microphone is paused during AI speech",
      location: "StreamingVoiceChat status indicators"
    },
    {
      feature: "Full System Diagnostics",
      description: "End-to-end testing of entire voice pipeline",
      location: "VoiceDiagnosticPanel 'Run Full Diagnostics'"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-6 rounded-lg">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            AI Voice Memory System - Complete Technical Report
          </h1>
          <p className="text-gray-700 mb-2">
            <strong>Last Updated:</strong> August 14, 2025 • <strong>Status:</strong> WORKING BUT SLOW - Performance Analysis Needed
          </p>
          <p className="text-orange-800 font-semibold">
            ⚡ System is working but response times are slow. This report documents current implementation for performance optimization analysis.
          </p>
        </div>

        {/* Executive Summary */}
        <Section
          title="Executive Summary & Current Issues"
          icon={<Brain />}
          expanded={expandedSections.includes('executive-summary')}
          onToggle={() => toggleSection('executive-summary')}
        >
          <div className="space-y-6">
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
              <h3 className="font-bold text-orange-800 mb-3">⚡ PERFORMANCE ISSUES REQUIRING OPTIMIZATION</h3>
              <div className="space-y-2 text-orange-700">
                <div>• <strong>Slow Response Time:</strong> Conversation feels unnatural due to processing delays</div>
                <div>• <strong>Audio Processing Latency:</strong> 1.5s chunks + processing time creates noticeable lag</div>
                <div>• <strong>Silence Detection Delay:</strong> 1.5s wait before sending transcription to AI</div>
                <div>• <strong>Streaming Not Real-time:</strong> Components work but not optimized for natural conversation flow</div>
              </div>
            </div>

            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-3">📊 WHAT WE'VE IMPLEMENTED</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">✅ WORKING Components:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>✅ WebRTC streaming voice chat (automatic conversation)</li>
                    <li>✅ Whisper speech-to-text (accurate transcription)</li>
                    <li>✅ GPT-4o streaming responses (working but slow)</li>
                    <li>✅ ElevenLabs voice synthesis (clear audio)</li>
                    <li>✅ Silence detection (1.5s threshold)</li>
                    <li>✅ Auto-resuming listening after AI speech</li>
                    <li>✅ Copyable text messages</li>
                    <li>✅ Clean UI with minimal debug info</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">⚡ PERFORMANCE Issues:</h4>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>🐌 Total response time: ~3-5 seconds (too slow)</li>
                    <li>🐌 Audio processing: 1.5s chunks + 800ms delay</li>
                    <li>🐌 GPT-4o streaming: Not optimized for speed</li>
                    <li>🐌 TTS generation: ElevenLabs API latency</li>
                    <li>🐌 Silence detection: Fixed 1.5s wait period</li>
                    <li>🐌 No parallel processing of audio chunks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <h3 className="font-bold text-green-800 mb-3">🔧 TESTING INTERFACE AVAILABLE</h3>
              <p className="text-green-700 mb-2">
                <strong>URL:</strong> <code className="bg-white px-2 py-1 rounded">http://localhost:3000/streaming-voice</code>
              </p>
              <p className="text-green-700 text-sm">
                The WebRTC component is working with full automatic conversation flow. User can speak naturally, 
                AI responds appropriately, and conversation continues automatically. Only issue is response time (3-5 seconds feels slow).
              </p>
            </div>
          </div>
        </Section>

        {/* Current Implementations */}
        <Section
          title="Current Implementations & Code"
          icon={<Code />}
          expanded={expandedSections.includes('implementations')}
          onToggle={() => toggleSection('implementations')}
        >
          <div className="space-y-6">
            {currentImplementations.map((impl, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{impl.component}</h3>
                    <p className="text-sm text-gray-600 font-mono">{impl.location}</p>
                    <p className="text-sm text-gray-700 mt-1">{impl.purpose}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    impl.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {impl.status}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {impl.features.map((feature, fIdx) => (
                      <li key={fIdx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* API Endpoints */}
        <Section
          title="API Endpoints & Implementation Details"
          icon={<Terminal />}
          expanded={expandedSections.includes('api-endpoints')}
          onToggle={() => toggleSection('api-endpoints')}
        >
          <div className="space-y-6">
            {apiEndpoints.map((api, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                          {api.method}
                        </span>
                        <code className="text-sm font-mono font-bold">{api.endpoint}</code>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          api.status === 'Production Ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {api.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{api.purpose}</p>
                      <p className="text-xs text-gray-500 mt-1">Last Updated: {api.lastUpdated}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Key Features & Recent Changes:</h4>
                    <ul className="space-y-1">
                      {api.keyFeatures.map((feature, fIdx) => (
                        <li key={fIdx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">Request Format:</span>
                        <button
                          onClick={() => copyToClipboard(api.request, `req-${idx}`)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedCode === `req-${idx}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        <code>{api.request}</code>
                      </pre>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">Response Format:</span>
                        <button
                          onClick={() => copyToClipboard(api.response, `res-${idx}`)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedCode === `res-${idx}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        <code>{api.response}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Challenges and Solutions */}
        <Section
          title="Challenges, Root Causes & Solutions"
          icon={<Bug />}
          expanded={expandedSections.includes('challenges')}
          onToggle={() => toggleSection('challenges')}
        >
          <div className="space-y-6">
            {challengesAndSolutions.map((challenge, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{challenge.challenge}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    challenge.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                    challenge.status === 'Ongoing Testing' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {challenge.status}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Problem Description:</h4>
                    <p className="text-sm text-gray-700">{challenge.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-red-700 mb-1">Root Cause Analysis:</h4>
                    <p className="text-sm text-red-800 bg-red-50 p-2 rounded">{challenge.rootCause}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-green-700 mb-1">Solution Implemented:</h4>
                    <p className="text-sm text-green-800 bg-green-50 p-2 rounded">{challenge.solution}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Code Changes Made:</h4>
                    <ul className="space-y-1">
                      {challenge.codeChanges.map((change, cIdx) => (
                        <li key={cIdx} className="text-sm text-blue-800 bg-blue-50 p-2 rounded flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Streaming Architecture */}
        <Section
          title="Streaming Architecture & Data Flow"
          icon={<Activity />}
          expanded={expandedSections.includes('architecture')}
          onToggle={() => toggleSection('architecture')}
        >
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Complete Streaming Pipeline</h3>
              <button
                onClick={() => copyToClipboard(streamingArchitecture, 'architecture')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copiedCode === 'architecture' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto font-mono">
              <code>{streamingArchitecture}</code>
            </pre>
          </div>
        </Section>

        {/* File Structure */}
        <Section
          title="Complete File Structure"
          icon={<Folder />}
          expanded={expandedSections.includes('file-structure')}
          onToggle={() => toggleSection('file-structure')}
        >
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">All AI Implementation Files</h3>
              <button
                onClick={() => copyToClipboard(fileStructure, 'files')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copiedCode === 'files' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto font-mono">
              <code>{fileStructure}</code>
            </pre>
          </div>
        </Section>

        {/* Debugging Capabilities */}
        <Section
          title="Debugging Capabilities & Monitoring"
          icon={<Monitor />}
          expanded={expandedSections.includes('debugging')}
          onToggle={() => toggleSection('debugging')}
        >
          <div className="space-y-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2">🔍 COMPREHENSIVE DEBUGGING SYSTEM</h3>
              <p className="text-yellow-700 text-sm">
                We've implemented extensive debugging capabilities to identify why real speech detection isn't working consistently.
                Visit <code className="bg-white px-1 rounded">localhost:3000/streaming-voice</code> to access these tools.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {debuggingCapabilities.map((debug, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{debug.feature}</h4>
                  <p className="text-sm text-gray-700 mb-2">{debug.description}</p>
                  <p className="text-xs text-blue-600 font-mono">{debug.location}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Environment & Dependencies */}
        <Section
          title="Environment Variables & Dependencies"
          icon={<Settings />}
          expanded={expandedSections.includes('environment')}
          onToggle={() => toggleSection('environment')}
        >
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Required Environment Variables (.env.local):</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
{`# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
ELEVEN_LABS_API_KEY=sk_...

# Voice Configuration  
ELEVEN_LABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM`}
              </pre>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Package Dependencies Added:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
{`"@anthropic-ai/sdk": "^latest"
"openai": "^latest"  
"elevenlabs": "^latest"
"uuid": "^latest"
"@types/uuid": "^latest"`}
              </pre>
            </div>
          </div>
        </Section>

        {/* Performance Optimization Recommendations */}
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-orange-900 mb-4">⚡ PERFORMANCE OPTIMIZATION RECOMMENDATIONS</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-orange-700 mb-3">🚀 High-Impact Optimizations:</h3>
              <ul className="text-orange-800 text-sm space-y-1">
                <li>• <strong>Reduce audio chunks:</strong> 24→12 chunks (1.5s→750ms)</li>
                <li>• <strong>Dynamic silence detection:</strong> Don't wait fixed 1.5s</li>
                <li>• <strong>Parallel processing:</strong> Start Whisper while still recording</li>
                <li>• <strong>GPT-4o optimization:</strong> Reduce max_tokens for voice responses</li>
                <li>• <strong>Streaming transcription:</strong> Send partial audio chunks</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-700 mb-3">🔧 Implementation Changes:</h3>
              <ul className="text-orange-800 text-sm space-y-1">
                <li>• <strong>Audio buffer size:</strong> Try 2048 instead of 4096</li>
                <li>• <strong>Silence threshold:</strong> 10-15 chunks instead of 22</li>
                <li>• <strong>GPT settings:</strong> max_tokens: 150, temperature: 0.5</li>
                <li>• <strong>Pre-processing:</strong> Start Whisper on 8-12 chunks</li>
                <li>• <strong>Response caching:</strong> Pre-generate common responses</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white border border-orange-300 rounded">
            <p className="text-orange-800 text-sm">
              <strong>Current Status:</strong> System is fully functional with automatic conversation flow. 
              The main issue is response time - optimizing the timing parameters above should significantly improve conversational feel.
            </p>
          </div>
          <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded">
            <p className="text-green-800 text-sm">
              <strong>Test URL:</strong> <code className="bg-white px-2 py-1 rounded">http://localhost:3000/streaming-voice</code> - 
              WebRTC component is the working implementation that needs performance tuning.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, expanded, onToggle, children }: any) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-600">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  )
}