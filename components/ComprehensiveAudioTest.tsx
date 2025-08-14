'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Volume2, Play, Square, TestTube, Speaker, Headphones, Activity, BarChart3 } from 'lucide-react'

export default function ComprehensiveAudioTest() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [peakLevel, setPeakLevel] = useState(0)
  const [isPlayingTest, setIsPlayingTest] = useState(false)
  const [testResults, setTestResults] = useState<Array<{
    test: string
    status: 'pass' | 'fail' | 'running' | 'pending'
    details: string
    timestamp: string
  }>>([])
  
  // Audio processing refs
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const addTestResult = (test: string, status: 'pass' | 'fail' | 'running' | 'pending', details: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === test)
      const newResult = {
        test,
        status,
        details,
        timestamp: new Date().toLocaleTimeString()
      }
      
      if (existing) {
        return prev.map(r => r.test === test ? newResult : r)
      } else {
        return [...prev, newResult]
      }
    })
  }

  const startMicrophoneTest = async () => {
    try {
      addTestResult('Microphone Access', 'running', 'Requesting microphone permission...')
      
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
      setIsRecording(true)
      
      addTestResult('Microphone Access', 'pass', 'Microphone access granted successfully')
      
      // Initialize audio analysis
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser
      
      source.connect(analyser)
      
      addTestResult('Audio Analysis', 'pass', 'Audio context and analyser initialized')
      
      // Start volume monitoring
      const monitorVolume = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        
        // Calculate average volume
        const sum = dataArray.reduce((acc, val) => acc + val, 0)
        const average = sum / dataArray.length
        const normalizedLevel = average / 255 * 100
        
        setAudioLevel(normalizedLevel)
        setPeakLevel(prev => Math.max(prev, normalizedLevel))
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(monitorVolume)
        }
      }
      
      monitorVolume()
      addTestResult('Volume Monitoring', 'pass', 'Real-time volume monitoring active')
      
    } catch (error) {
      addTestResult('Microphone Access', 'fail', `Failed: ${error}`)
      console.error('Microphone test failed:', error)
    }
  }

  const stopMicrophoneTest = () => {
    setIsRecording(false)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setAudioLevel(0)
    addTestResult('Microphone Test', 'pass', 'Microphone test completed successfully')
  }

  const testTTSServices = async () => {
    const testText = "This is a test of the text-to-speech system. Can you hear me clearly?"
    
    // Test ElevenLabs
    try {
      addTestResult('ElevenLabs TTS', 'running', 'Testing ElevenLabs voice synthesis...')
      
      const response = await fetch('/api/ai/tts-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      })
      
      if (response.ok) {
        const audioBlob = await response.blob()
        setIsPlayingTest(true)
        
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => {
          setIsPlayingTest(false)
          addTestResult('ElevenLabs TTS', 'pass', `Audio generated: ${Math.round(audioBlob.size/1024)}KB`)
        }
        
        audio.onerror = () => {
          setIsPlayingTest(false)
          addTestResult('ElevenLabs TTS', 'fail', 'Audio playback failed')
        }
        
        await audio.play()
      } else {
        addTestResult('ElevenLabs TTS', 'fail', `HTTP ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      addTestResult('ElevenLabs TTS', 'fail', `Error: ${error}`)
    }
  }

  const testWhisperAPI = async () => {
    if (!streamRef.current) {
      addTestResult('Whisper STT', 'fail', 'No microphone stream available')
      return
    }

    try {
      addTestResult('Whisper STT', 'running', 'Recording audio for Whisper test...')
      
      // Record 3 seconds of audio
      const mediaRecorder = new MediaRecorder(streamRef.current)
      const audioChunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        
        const formData = new FormData()
        formData.append('audio', audioBlob, 'whisper-test.webm')
        
        try {
          const response = await fetch('/api/ai/whisper-streaming', {
            method: 'POST',
            body: formData
          })
          
          const data = await response.json()
          
          if (data.success) {
            addTestResult('Whisper STT', 'pass', `Transcribed: "${data.transcription}"`)
          } else {
            addTestResult('Whisper STT', 'fail', `Failed: ${data.error || data.reason}`)
          }
          
        } catch (error) {
          addTestResult('Whisper STT', 'fail', `API Error: ${error}`)
        }
      }
      
      mediaRecorder.start()
      setTimeout(() => mediaRecorder.stop(), 3000)
      
    } catch (error) {
      addTestResult('Whisper STT', 'fail', `Recording error: ${error}`)
    }
  }

  const testGPT4oAPI = async () => {
    try {
      addTestResult('GPT-4o Streaming', 'running', 'Testing streaming conversation...')
      
      const response = await fetch('/api/ai/gpt4o-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "This is a test message. Please respond briefly.",
          conversationHistory: []
        })
      })
      
      if (response.ok) {
        const reader = response.body?.getReader()
        if (reader) {
          let chunks = 0
          const decoder = new TextDecoder()
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            chunks++
          }
          
          addTestResult('GPT-4o Streaming', 'pass', `Received ${chunks} streaming chunks`)
        }
      } else {
        addTestResult('GPT-4o Streaming', 'fail', `HTTP ${response.status}`)
      }
      
    } catch (error) {
      addTestResult('GPT-4o Streaming', 'fail', `Error: ${error}`)
    }
  }

  const runAllTests = async () => {
    setTestResults([])
    
    // Start microphone first
    await startMicrophoneTest()
    
    // Wait a bit for microphone to initialize
    setTimeout(async () => {
      await testTTSServices()
      await new Promise(resolve => setTimeout(resolve, 1000))
      await testWhisperAPI()
      await new Promise(resolve => setTimeout(resolve, 1000)) 
      await testGPT4oAPI()
    }, 2000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <span className="text-green-600">✅</span>
      case 'fail': return <span className="text-red-600">❌</span>
      case 'running': return <span className="text-blue-600 animate-spin">⟳</span>
      default: return <span className="text-gray-400">⭕</span>
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TestTube className="w-6 h-6 text-purple-600" />
          Comprehensive Audio System Tests
        </h3>
        <button
          onClick={runAllTests}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Run All Tests
        </button>
      </div>

      {/* Volume Meter */}
      {isRecording && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Real-Time Audio Volume Monitor
          </h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-green-700 mb-1">
                <span>Current Level</span>
                <span>{Math.round(audioLevel)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-4 relative overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-100 rounded-full"
                  style={{ width: `${audioLevel}%` }}
                />
                {audioLevel > 50 && (
                  <div className="absolute inset-0 bg-yellow-400 opacity-30 animate-pulse" />
                )}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm text-green-700 mb-1">
                <span>Peak Level</span>
                <span>{Math.round(peakLevel)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${peakLevel}%` }}
                />
              </div>
            </div>
            
            <div className="text-xs text-green-600">
              {audioLevel > 10 ? 
                '🎤 Audio detected - speak louder to test volume levels' : 
                '🔇 Speak into your microphone to see volume levels'
              }
            </div>
          </div>
        </div>
      )}

      {/* Individual Test Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={isRecording ? stopMicrophoneTest : startMicrophoneTest}
          className={`p-3 rounded-lg flex flex-col items-center gap-2 text-sm ${
            isRecording 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
          }`}
        >
          <Mic className="w-5 h-5" />
          {isRecording ? 'Stop Mic Test' : 'Test Microphone'}
        </button>
        
        <button
          onClick={testTTSServices}
          disabled={isPlayingTest}
          className="p-3 rounded-lg flex flex-col items-center gap-2 text-sm bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 disabled:opacity-50"
        >
          <Speaker className="w-5 h-5" />
          Test Voice (ElevenLabs)
        </button>
        
        <button
          onClick={testWhisperAPI}
          disabled={!isRecording}
          className="p-3 rounded-lg flex flex-col items-center gap-2 text-sm bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 disabled:opacity-50"
        >
          <Headphones className="w-5 h-5" />
          Test Whisper STT
        </button>
        
        <button
          onClick={testGPT4oAPI}
          className="p-3 rounded-lg flex flex-col items-center gap-2 text-sm bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200"
        >
          <Activity className="w-5 h-5" />
          Test GPT-4o
        </button>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <Mic className={`w-4 h-4 ${isRecording ? 'text-green-600' : 'text-gray-400'}`} />
          <span>Recording: {isRecording ? 'Active' : 'Inactive'}</span>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <Volume2 className={`w-4 h-4 ${isPlayingTest ? 'text-blue-600' : 'text-gray-400'}`} />
          <span>Speaking: {isPlayingTest ? 'Playing' : 'Silent'}</span>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <Activity className={`w-4 h-4 ${audioLevel > 10 ? 'text-green-600' : 'text-gray-400'}`} />
          <span>Audio: {audioLevel > 10 ? 'Detected' : 'Silent'}</span>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Test Results</h4>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.test}</span>
                </div>
                <div className="text-right">
                  <div className="text-gray-700">{result.details}</div>
                  <div className="text-xs text-gray-500">{result.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <p><strong>How to use:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Click "Run All Tests" for complete system verification</li>
          <li>Use individual test buttons to isolate specific components</li>
          <li>Watch the volume meter to verify microphone sensitivity</li>
          <li>Check console logs for detailed debugging information</li>
        </ul>
      </div>
    </div>
  )
}