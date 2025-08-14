'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Activity, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'

interface DiagnosticTest {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'failed'
  result?: string
  duration?: number
  error?: string
}

interface AudioStats {
  size: number
  type: string
  duration: number
  sampleRate?: number
}

export default function VoiceDiagnosticPanel() {
  const [tests, setTests] = useState<DiagnosticTest[]>([
    { id: 'microphone', name: 'Microphone Access', status: 'pending' },
    { id: 'recording', name: 'Audio Recording', status: 'pending' },
    { id: 'transcription', name: 'Speech Recognition', status: 'pending' },
    { id: 'synthesis', name: 'Voice Synthesis', status: 'pending' },
    { id: 'realSpeech', name: 'Real Speech Detection', status: 'pending' }
  ])
  
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null)
  const [transcriptionHistory, setTranscriptionHistory] = useState<Array<{
    timestamp: string
    input: string
    output: string
    filtered: boolean
    confidence: number
  }>>([])
  
  const [realTimeTranscription, setRealTimeTranscription] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const updateTest = (id: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ))
  }

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true)
    setTranscriptionHistory([])
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })))
    
    try {
      // Test 1: Microphone Access
      setCurrentTest('microphone')
      updateTest('microphone', { status: 'running' })
      
      const startTime = Date.now()
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
      
      streamRef.current = stream
      const micDuration = Date.now() - startTime
      updateTest('microphone', { 
        status: 'success', 
        result: 'Microphone access granted',
        duration: micDuration
      })
      
      // Test 2: Audio Recording
      setCurrentTest('recording')
      updateTest('recording', { status: 'running' })
      
      const recordingStart = Date.now()
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      await new Promise<void>((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
          setAudioStats({
            size: audioBlob.size,
            type: audioBlob.type,
            duration: (Date.now() - recordingStart) / 1000
          })
          resolve()
        }
        
        mediaRecorder.start()
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        }, 2000) // Record for 2 seconds
      })
      
      const recordingDuration = Date.now() - recordingStart
      updateTest('recording', { 
        status: 'success', 
        result: `Recorded ${Math.round(audioStats?.size || 0 / 1024)}KB in ${recordingDuration}ms`,
        duration: recordingDuration
      })
      
      // Test 3: Speech Recognition
      setCurrentTest('transcription')
      updateTest('transcription', { status: 'running' })
      
      const transcriptionStart = Date.now()
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'diagnostic.webm')
      
      const transcribeResponse = await fetch('/api/ai/streaming-speech-to-text', {
        method: 'POST',
        body: formData
      })
      
      const transcribeData = await transcribeResponse.json()
      const transcriptionDuration = Date.now() - transcriptionStart
      
      if (transcribeData.success) {
        updateTest('transcription', { 
          status: 'success', 
          result: `Transcribed: "${transcribeData.transcription}"`,
          duration: transcriptionDuration
        })
      } else {
        updateTest('transcription', { 
          status: transcribeData.isHallucination ? 'success' : 'failed', 
          result: transcribeData.isHallucination 
            ? `Correctly filtered hallucination: "${transcribeData.transcription}"`
            : `Failed: ${transcribeData.reason}`,
          duration: transcriptionDuration,
          error: transcribeData.isHallucination ? undefined : transcribeData.reason
        })
      }
      
      // Test 4: Voice Synthesis
      setCurrentTest('synthesis')
      updateTest('synthesis', { status: 'running' })
      
      const synthesisStart = Date.now()
      const synthResponse = await fetch('/api/ai/voice-synthesis-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Diagnostic test successful' })
      })
      
      const synthDuration = Date.now() - synthesisStart
      
      if (synthResponse.ok) {
        updateTest('synthesis', { 
          status: 'success', 
          result: 'Voice synthesis working',
          duration: synthDuration
        })
      } else {
        updateTest('synthesis', { 
          status: 'failed', 
          result: 'Voice synthesis failed',
          duration: synthDuration,
          error: `HTTP ${synthResponse.status}`
        })
      }
      
      // Test 5: Real Speech Detection
      setCurrentTest('realSpeech')
      updateTest('realSpeech', { status: 'running' })
      updateTest('realSpeech', { 
        status: 'success', 
        result: 'Ready for real speech testing - speak now!',
        duration: 0
      })
      
    } catch (error) {
      console.error('Diagnostic error:', error)
      if (currentTest) {
        updateTest(currentTest, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } finally {
      setIsRunning(false)
      setCurrentTest(null)
    }
  }

  const startRealTimeListening = async () => {
    if (!streamRef.current) {
      await runComprehensiveDiagnostics()
      return
    }
    
    setIsListening(true)
    setRealTimeTranscription('')
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    })
    
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }
    
    mediaRecorder.onstop = async () => {
      if (audioChunksRef.current.length === 0) return
      
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
      
      // Update audio stats
      setAudioStats({
        size: audioBlob.size,
        type: audioBlob.type,
        duration: 1.5
      })
      
      // Test transcription
      const formData = new FormData()
      formData.append('audio', audioBlob, 'realtime.webm')
      
      try {
        const response = await fetch('/api/ai/streaming-speech-to-text', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        // Add to history
        const historyEntry = {
          timestamp: new Date().toLocaleTimeString(),
          input: `${Math.round(audioBlob.size/1024)}KB audio`,
          output: data.transcription || data.reason || 'No result',
          filtered: !data.success,
          confidence: data.confidence || 0
        }
        
        setTranscriptionHistory(prev => [...prev.slice(-9), historyEntry])
        
        // Update real-time transcription immediately
        if (data.success) {
          console.log('🎤 REAL-TIME UPDATE:', data.transcription)
          setRealTimeTranscription(data.transcription)
        } else {
          console.log('🚫 FILTERED:', data.reason)
          setRealTimeTranscription(`[Filtered: ${data.reason}]`)
        }
        
        // Force a state update to ensure UI refreshes
        setTimeout(() => {
          if (data.success) {
            setRealTimeTranscription(data.transcription)
          }
        }, 100)
        
      } catch (error) {
        console.error('Real-time transcription error:', error)
        setRealTimeTranscription(`[Error: ${error}]`)
      }
      
      audioChunksRef.current = []
      
      // Continue listening
      if (isListening) {
        setTimeout(() => {
          if (mediaRecorder.state === 'inactive' && isListening) {
            mediaRecorder.start()
          }
        }, 100)
      }
    }
    
    mediaRecorder.start()
    
    // Auto-restart every 1.5 seconds
    const interval = setInterval(() => {
      if (mediaRecorder.state === 'recording' && isListening) {
        mediaRecorder.stop()
      }
    }, 1500)
    
    return () => clearInterval(interval)
  }

  const stopRealTimeListening = () => {
    setIsListening(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsListening(false)
  }

  useEffect(() => {
    return cleanup
  }, [])

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
      case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-spin" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-500" />
          Voice System Diagnostics
        </h2>
        <div className="flex gap-2">
          <button
            onClick={runComprehensiveDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isRunning ? 'Running Tests...' : 'Run Full Diagnostics'}
          </button>
          <button
            onClick={isListening ? stopRealTimeListening : startRealTimeListening}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Stop Listening' : 'Start Real-Time Test'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => (
          <div key={test.id} className={`p-4 rounded-lg border-2 ${
            test.status === 'success' ? 'border-green-200 bg-green-50' :
            test.status === 'failed' ? 'border-red-200 bg-red-50' :
            test.status === 'running' ? 'border-blue-200 bg-blue-50' :
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(test.status)}
              <h3 className="font-semibold text-sm">{test.name}</h3>
            </div>
            {test.result && (
              <p className="text-xs text-gray-700 mb-1">{test.result}</p>
            )}
            {test.duration !== undefined && (
              <p className="text-xs text-gray-500">Duration: {test.duration}ms</p>
            )}
            {test.error && (
              <p className="text-xs text-red-600">Error: {test.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Audio Stats */}
      {audioStats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Latest Audio Capture
          </h3>
          <div className="text-xs text-gray-700 space-y-1">
            <div>Size: {Math.round(audioStats.size / 1024)}KB</div>
            <div>Type: {audioStats.type}</div>
            <div>Duration: {audioStats.duration}s</div>
          </div>
        </div>
      )}

      {/* Real-Time Transcription */}
      {isListening && (
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Mic className="w-4 h-4 text-blue-500" />
            Real-Time Transcription
          </h3>
          <div className="bg-white rounded p-3 min-h-[60px] flex items-center">
            {realTimeTranscription ? (
              <p className="text-sm">{realTimeTranscription}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">Speak now to test real-time transcription...</p>
            )}
          </div>
        </div>
      )}

      {/* Transcription History */}
      {transcriptionHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Transcription History</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transcriptionHistory.map((entry, index) => (
              <div key={index} className={`p-2 rounded text-xs ${
                entry.filtered ? 'bg-yellow-100 border border-yellow-300' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{entry.timestamp}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    entry.filtered ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                  }`}>
                    {entry.filtered ? 'Filtered' : 'Accepted'}
                  </span>
                </div>
                <div>Input: {entry.input}</div>
                <div>Output: {entry.output}</div>
                {!entry.filtered && <div>Confidence: {Math.round(entry.confidence * 100)}%</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}