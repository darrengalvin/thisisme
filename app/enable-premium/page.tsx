'use client'

import { useState, useEffect } from 'react'
import { Crown, CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function EnablePremiumPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [currentPremiumStatus, setCurrentPremiumStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    checkPremiumStatus()
  }, [])

  const checkPremiumStatus = async () => {
    setCheckingStatus(true)
    try {
      const response = await fetch('/api/user/premium-status')
      if (response.ok) {
        const data = await response.json()
        setCurrentPremiumStatus(data)
      }
    } catch (error) {
      console.error('Error checking premium status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const enablePremium = async () => {
    setLoading(true)
    setStatus('idle')
    
    try {
      // Try the main endpoint first
      let response = await fetch('/api/admin/enable-premium', {
        method: 'POST',
      })
      
      let data = await response.json()
      
      // If main endpoint fails, try the simple endpoint
      if (!response.ok) {
        console.log('Main endpoint failed, trying simple endpoint...')
        response = await fetch('/api/admin/simple-enable-premium', {
          method: 'POST',
        })
        data = await response.json()
      }
      
      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Premium enabled successfully!')
        console.log('Premium enabled:', data)
        // Refresh premium status
        setTimeout(() => {
          checkPremiumStatus()
        }, 1000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to enable premium')
        console.error('Error details:', data.details)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error. Please try again.')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4">
            <Crown size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enable Premium Access
          </h1>
          <p className="text-gray-600">
            Click the button below to enable premium features for dgalvin@yourcaio.co.uk
          </p>
        </div>

        {/* Current Status */}
        {!checkingStatus && currentPremiumStatus && (
          <div className={`mb-6 p-4 ${currentPremiumStatus.isPremium ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl`}>
            <div className="flex items-start space-x-3">
              <Info size={20} className={currentPremiumStatus.isPremium ? 'text-green-600' : 'text-yellow-600'} />
              <div className="text-sm">
                <p className={`font-medium ${currentPremiumStatus.isPremium ? 'text-green-800' : 'text-yellow-800'}`}>
                  Current Status: {currentPremiumStatus.isPremium ? '✅ Premium Active' : '⚠️ Free Account'}
                </p>
                {currentPremiumStatus.isPremium && (
                  <p className="text-green-700 mt-1">
                    Tier: {currentPremiumStatus.tier} | Voice transcription is enabled
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={enablePremium}
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Enabling Premium...</span>
            </>
          ) : (
            <>
              <Crown size={20} />
              <span>Enable Premium for 1 Year</span>
            </>
          )}
        </button>

        {status === 'success' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">Success!</p>
                <p className="text-green-700 text-sm mt-1">{message}</p>
                <p className="text-green-600 text-xs mt-2">
                  You can now use voice transcription in the memory creation wizard.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{message}</p>
                <p className="text-red-600 text-xs mt-2">
                  Check the console for more details.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <h3 className="font-medium text-purple-900 mb-2">Premium Features Include:</h3>
          <ul className="space-y-2 text-sm text-purple-700">
            <li className="flex items-center space-x-2">
              <span className="text-purple-500">✓</span>
              <span>AI Voice Transcription (Whisper)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-purple-500">✓</span>
              <span>Unlimited Memories</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-purple-500">✓</span>
              <span>Advanced Search</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-purple-500">✓</span>
              <span>Priority Support</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}