'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Pause, Play, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useAuth } from '@/components/AuthProvider'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
  onClose: () => void
  isPremium: boolean
}

export default function VoiceRecorder({ onTranscription, onClose, isPremium }: VoiceRecorderProps) {
  const { user } = useAuth()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(false)
  
  const {
    isRecording,
    isPaused,
    formattedTime,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder({
    maxDuration: 300000,
    onRecordingComplete: async (blob) => {
      await handleTranscription(blob)
    }
  })

  useEffect(() => {
    if (!isPremium) {
      onClose()
    }
  }, [isPremium, onClose])

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true)
    setTranscriptionError(null)
    setTranscriptionSuccess(false)

    try {
      if (!user) {
        throw new Error('Please log in to use voice transcription')
      }
      
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Authentication failed')
      }

      const { token } = await tokenResponse.json()

      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Transcription API error:', error)
        throw new Error(error.error || error.details || 'Transcription failed')
      }

      const data = await response.json()
      
      if (data.transcription && data.transcription.trim()) {
        onTranscription(data.transcription)
        setTranscriptionSuccess(true)
        
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        throw new Error('No transcription received')
      }
    } catch (error: any) {
      console.error('Transcription error:', error)
      setTranscriptionError(error.message || 'Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleStop = () => {
    stopRecording()
  }

  const handleRetry = () => {
    setTranscriptionError(null)
    setTranscriptionSuccess(false)
    resetRecording()
    startRecording()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">Voice Transcription</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={isRecording || isTranscribing}
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-slate-300 text-sm">
            Speak naturally and we'll transcribe your memory
          </p>
        </div>

        <div className="p-6">
          {recordingError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <p className="text-sm text-red-700">{recordingError}</p>
              </div>
            </div>
          )}

          {transcriptionError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{transcriptionError}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {transcriptionSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-500" />
                <p className="text-sm text-green-700">Transcription successful!</p>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center space-y-6">
            {!isRecording && !audioBlob && !isTranscribing && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-slate-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <button
                    onClick={startRecording}
                    className="relative p-8 bg-slate-700 hover:bg-slate-800 text-white rounded-full hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Mic size={32} />
                  </button>
                </div>
                <p className="text-slate-600 text-center">
                  Tap to start recording<br />
                  <span className="text-sm text-slate-500">Maximum 5 minutes</span>
                </p>
              </>
            )}

            {isRecording && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative p-8 bg-red-500 text-white rounded-full animate-pulse">
                    <Mic size={32} />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-slate-800 mb-2">
                    {formattedTime}
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-500 font-medium">Recording</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {!isPaused ? (
                    <button
                      onClick={pauseRecording}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      <Pause size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                    >
                      <Play size={20} />
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-full transition-colors flex items-center space-x-2"
                  >
                    <MicOff size={20} />
                    <span>Stop & Transcribe</span>
                  </button>
                </div>
              </>
            )}

            {isTranscribing && (
              <>
                <div className="p-8 bg-slate-100 rounded-full">
                  <Loader2 size={32} className="text-slate-600 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-medium mb-1">Processing your audio...</p>
                  <p className="text-sm text-slate-600">Using AI to transcribe your memory</p>
                </div>
              </>
            )}
          </div>

          {!isRecording && !isTranscribing && (
            <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-700 text-center">
                🎙️ Tip: Speak clearly and naturally. Our AI will handle punctuation and formatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}