'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Play, Square, Volume2 } from 'lucide-react'

export default function RealTimeVoiceTest() {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [transcriptionChunks, setTranscriptionChunks] = useState<string[]>([])
  const [chunkCount, setChunkCount] = useState(0)
  const [audioStats, setAudioStats] = useState({ size: 0, duration: 0 })
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRealTimeTest = async () => {
    try {
      console.log('🎙️ Starting real-time voice test...')
      
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
      setIsListening(true)
      setTranscriptionChunks([])
      setCurrentTranscription('')
      setChunkCount(0)
      
      // Create MediaRecorder exactly like StreamingVoiceChat
      const mediaRecorder = new MediaRecorder(stream, {
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
        
        // Skip tiny audio chunks (exactly like StreamingVoiceChat)
        if (audioBlob.size < 5000) {
          console.log('🔇 Skipping tiny audio chunk')
          audioChunksRef.current = []
          return
        }
        
        await processChunkInRealTime(audioBlob)
        audioChunksRef.current = []
      }
      
      // Start recording exactly like StreamingVoiceChat
      mediaRecorder.start()
      
      // Set up 1.5-second intervals with forced chunking
      streamingIntervalRef.current = setInterval(() => {
        console.log(`⏰ INTERVAL FIRED - Recorder State: ${mediaRecorder.state}, IsListening: ${isListening}`)
        
        if (mediaRecorder.state === 'recording' && isListening) {
          console.log('🔄 FORCING CHUNK STOP...')
          mediaRecorder.stop()
          
          // Restart immediately for continuous streaming
          setTimeout(() => {
            if (isListening) {
              console.log('🔄 RESTARTING RECORDER...')
              if (mediaRecorder.state === 'inactive') {
                mediaRecorder.start()
                console.log('✅ RECORDER RESTARTED')
              } else {
                console.log('⚠️ RECORDER NOT INACTIVE:', mediaRecorder.state)
              }
            }
          }, 50) // Faster restart
        } else {
          console.log('❌ INTERVAL CONDITIONS NOT MET')
        }
      }, 1500) // 1.5 seconds
      
    } catch (error) {
      console.error('Failed to start real-time test:', error)
    }
  }

  const processChunkInRealTime = async (audioBlob: Blob) => {
    try {
      setChunkCount(prev => {
        const newCount = prev + 1
        console.log(`🎤 CHUNK ${newCount}: Processing ${Math.round(audioBlob.size / 1024)}KB (Duration: ${audioBlob.size > 100000 ? 'LONG' : 'Normal'})`)
        setAudioStats({ size: audioBlob.size, duration: 1.5 })
        return newCount
      })
      
      // Use the same API endpoint as StreamingVoiceChat
      const formData = new FormData()
      formData.append('audio', audioBlob, 'streaming.webm')
      
      const transcribeResponse = await fetch('/api/ai/streaming-speech-to-text', {
        method: 'POST',
        body: formData
      })
      
      const transcribeData = await transcribeResponse.json()
      
      setChunkCount(currentCount => {
        console.log(`🎤 CHUNK ${currentCount} RESULT:`, transcribeData)
        
        if (transcribeData.success) {
          const newChunk = `[Chunk ${currentCount}] ${transcribeData.transcription}`
          console.log(`✅ DISPLAYING: ${newChunk}`)
          
          // Add to chunks list
          setTranscriptionChunks(prev => [...prev, newChunk])
          
          // Update current transcription immediately
          setCurrentTranscription(transcribeData.transcription)
          
        } else {
          const filteredChunk = `[Chunk ${currentCount}] [FILTERED: ${transcribeData.reason}]`
          console.log(`🚫 FILTERED: ${filteredChunk}`)
          setTranscriptionChunks(prev => [...prev, filteredChunk])
          setCurrentTranscription(`[Filtered: ${transcribeData.reason}]`)
        }
        
        return currentCount
      })
      
    } catch (error) {
      console.error('Error processing chunk:', error)
      setCurrentTranscription(`[Error: ${error}]`)
    }
  }

  const stopRealTimeTest = () => {
    console.log('🛑 Stopping real-time test...')
    
    setIsListening(false)
    
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-purple-900">🚀 True Real-Time Voice Test</h3>
        <div className="flex gap-2">
          <button
            onClick={isListening ? stopRealTimeTest : startRealTimeTest}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            {isListening ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isListening ? 'Stop Test' : 'Start Streaming Test'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isListening ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm font-medium">
              {isListening ? `Recording (Chunk ${chunkCount})` : 'Ready to start'}
            </span>
          </div>
          {audioStats.size > 0 && (
            <span className="text-xs text-gray-600">
              Latest: {Math.round(audioStats.size / 1024)}KB, {audioStats.duration}s
            </span>
          )}
        </div>
      </div>

      {/* Current Real-Time Transcription */}
      {isListening && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Live Transcription:
          </h4>
          <div className="bg-white p-3 rounded min-h-[60px] border">
            {currentTranscription ? (
              <p className="text-sm">{currentTranscription}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">Speak now - transcription will appear here as you talk...</p>
            )}
          </div>
        </div>
      )}

      {/* Chunk History */}
      {transcriptionChunks.length > 0 && (
        <div className="bg-white border rounded p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Chunk-by-Chunk History:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transcriptionChunks.map((chunk, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  chunk.includes('[FILTERED:') 
                    ? 'bg-red-50 border border-red-200 text-red-800' 
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                {chunk}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-purple-600">
        <p>This test processes audio in 1.5-second chunks exactly like the main streaming interface.</p>
        <p>You should see transcriptions appear in real-time as you speak, not just when you stop.</p>
      </div>
    </div>
  )
}