'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Mail, MessageSquare, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function ServiceTest() {
  const { user } = useAuth()
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testType, setTestType] = useState<'email' | 'sms' | 'both'>('both')
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runTest = async () => {
    if (!user) return

    setIsTesting(true)
    setResults(null)

    try {
      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get auth token')
      }

      const { token } = await tokenResponse.json()

      // Run service test
      const testResponse = await fetch('/api/test-services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: testType === 'email' || testType === 'both' ? testEmail : undefined,
          testPhone: testType === 'sms' || testType === 'both' ? testPhone : undefined,
          testType
        })
      })

      const testResults = await testResponse.json()
      setResults(testResults)

    } catch (error) {
      console.error('Test error:', error)
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Integration Test</h2>
      
      <div className="space-y-4">
        {/* Test Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="email"
                checked={testType === 'email'}
                onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                className="mr-2"
              />
              <Mail className="w-4 h-4 mr-1" />
              Email Only
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="sms"
                checked={testType === 'sms'}
                onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                className="mr-2"
              />
              <MessageSquare className="w-4 h-4 mr-1" />
              SMS Only
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="testType"
                value="both"
                checked={testType === 'both'}
                onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                className="mr-2"
              />
              Both Services
            </label>
          </div>
        </div>

        {/* Email Input */}
        {(testType === 'email' || testType === 'both') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Email Address</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Phone Input */}
        {(testType === 'sms' || testType === 'both') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Phone Number</label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Enter your phone number (e.g., +447307261557)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={runTest}
          disabled={isTesting || (!testEmail && (testType === 'email' || testType === 'both')) || (!testPhone && (testType === 'sms' || testType === 'both'))}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isTesting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Testing Services...</span>
            </>
          ) : (
            <span>Run Test</span>
          )}
        </button>

        {/* Results */}
        {results && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
            
            {/* Overall Status */}
            <div className={`p-4 rounded-lg ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                {results.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                )}
                <span className={`font-medium ${results.success ? 'text-green-800' : 'text-red-800'}`}>
                  {results.success ? 'All tests passed!' : 'Some tests failed'}
                </span>
              </div>
            </div>

            {/* Resend Results */}
            {results.results?.resend && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Resend (Email)</h4>
                <div className="flex items-center">
                  {results.results.resend.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  <span className="text-sm">
                    {results.results.resend.success ? results.results.resend.message : results.results.resend.error}
                  </span>
                </div>
                {results.results.resend.messageId && (
                  <p className="text-xs text-gray-500 mt-1">Message ID: {results.results.resend.messageId}</p>
                )}
              </div>
            )}

            {/* Twilio Results */}
            {results.results?.twilio && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Twilio (SMS)</h4>
                <div className="flex items-center">
                  {results.results.twilio.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  <span className="text-sm">
                    {results.results.twilio.success ? results.results.twilio.message : results.results.twilio.error}
                  </span>
                </div>
                {results.results.twilio.messageSid && (
                  <p className="text-xs text-gray-500 mt-1">Message SID: {results.results.twilio.messageSid}</p>
                )}
              </div>
            )}

            {/* Errors */}
            {results.errors && results.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {results.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
