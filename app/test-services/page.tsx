'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Mail, MessageSquare, CheckCircle, XCircle, Loader, Phone, Send } from 'lucide-react'

export default function TestServicesPage() {
  const { user } = useAuth()
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testType, setTestType] = useState<'email' | 'sms' | 'both'>('both')
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runTest = async () => {
    console.log('Button clicked!', { user: !!user, testType, testEmail, testPhone })
    
    if (!user) {
      console.log('No user found')
      setResults({
        success: false,
        error: 'Please log in to test services'
      })
      return
    }

    console.log('Starting test...', { testType, testEmail, testPhone })
    setIsTesting(true)
    setResults(null)

    try {
      // Get JWT token
      console.log('Getting auth token...')
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token response error:', errorText)
        throw new Error(`Failed to get auth token: ${errorText}`)
      }

      const { token } = await tokenResponse.json()
      console.log('Got token:', token ? 'Yes' : 'No')

      // Format phone number with country code if needed
      let formattedPhone = testPhone
      if (testPhone && !testPhone.startsWith('+')) {
        // Assume UK number if no country code
        formattedPhone = '+44' + testPhone.replace(/^0/, '')
      }

      console.log('Formatted phone:', formattedPhone)

      // Run service test
      const testPayload = {
        testEmail: testType === 'email' || testType === 'both' ? testEmail : undefined,
        testPhone: testType === 'sms' || testType === 'both' ? formattedPhone : undefined,
        testType
      }
      
      console.log('Test payload:', testPayload)

      const testResponse = await fetch('/api/test-services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      })

      console.log('Test response status:', testResponse.status)
      const testResults = await testResponse.json()
      console.log('Test results:', testResults)
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Integration Test</h1>
            <p className="text-gray-600">Test your Resend email and Twilio SMS services</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Configuration Status */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration Status</h2>
              
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Resend Email Service</p>
                    <p className="text-sm text-green-600">Domain: yourcaio.co.uk</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Twilio SMS Service</p>
                    <p className="text-sm text-green-600">Phone: +447307261557</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-blue-800">Voice Webhooks</p>
                    <p className="text-sm text-blue-600">Ready for voice calls</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Controls */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Tests</h2>
              
              {/* Test Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Test Type</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="testType"
                      value="email"
                      checked={testType === 'email'}
                      onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                      className="mr-3"
                    />
                    <Mail className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="font-medium">Email Only</span>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="testType"
                      value="sms"
                      checked={testType === 'sms'}
                      onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                      className="mr-3"
                    />
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    <span className="font-medium">SMS Only</span>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="testType"
                      value="both"
                      checked={testType === 'both'}
                      onChange={(e) => setTestType(e.target.value as 'email' | 'sms' | 'both')}
                      className="mr-3"
                    />
                    <Send className="w-5 h-5 mr-2 text-purple-600" />
                    <span className="font-medium">Both Services</span>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="Enter your phone number (e.g., 07460573924 or +447460573924)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    UK numbers will be automatically formatted with +44
                  </p>
                </div>
              )}

              {/* Test Button */}
              <button
                onClick={() => {
                  console.log('Button clicked!')
                  runTest()
                }}
                disabled={isTesting || (!testEmail && (testType === 'email' || testType === 'both')) || (!testPhone && (testType === 'sms' || testType === 'both'))}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
              >
                {isTesting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Testing Services...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Run Test</span>
                  </>
                )}
              </button>
              
              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
                <p>Test Type: {testType}</p>
                <p>Email: {testEmail || 'Not provided'}</p>
                <p>Phone: {testPhone || 'Not provided'}</p>
                <p>Button Disabled: {isTesting || (!testEmail && (testType === 'email' || testType === 'both')) || (!testPhone && (testType === 'sms' || testType === 'both')) ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Test Results</h3>
              
              {/* Overall Status */}
              <div className={`p-6 rounded-xl mb-6 ${results.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center">
                  {results.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 mr-3" />
                  )}
                  <div>
                    <h4 className={`text-lg font-semibold ${results.success ? 'text-green-800' : 'text-red-800'}`}>
                      {results.success ? 'All tests passed! 🎉' : 'Some tests failed'}
                    </h4>
                    <p className={`text-sm ${results.success ? 'text-green-600' : 'text-red-600'}`}>
                      {results.success ? 'Your services are working correctly' : 'Check the details below for issues'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Resend Results */}
                {results.results?.resend && (
                  <div className="p-6 bg-gray-50 rounded-xl border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-blue-600" />
                      Resend (Email)
                    </h4>
                    <div className="flex items-center mb-2">
                      {results.results.resend.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mr-2" />
                      )}
                      <span className={`font-medium ${results.results.resend.success ? 'text-green-800' : 'text-red-800'}`}>
                        {results.results.resend.success ? 'Success!' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {results.results.resend.success ? results.results.resend.message : results.results.resend.error}
                    </p>
                    {results.results.resend.messageId && (
                      <p className="text-xs text-gray-500">Message ID: {results.results.resend.messageId}</p>
                    )}
                  </div>
                )}

                {/* Twilio Results */}
                {results.results?.twilio && (
                  <div className="p-6 bg-gray-50 rounded-xl border">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                      Twilio (SMS)
                    </h4>
                    <div className="flex items-center mb-2">
                      {results.results.twilio.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mr-2" />
                      )}
                      <span className={`font-medium ${results.results.twilio.success ? 'text-green-800' : 'text-red-800'}`}>
                        {results.results.twilio.success ? 'Success!' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {results.results.twilio.success ? results.results.twilio.message : results.results.twilio.error}
                    </p>
                    {results.results.twilio.messageSid && (
                      <p className="text-xs text-gray-500">Message SID: {results.results.twilio.messageSid}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Errors */}
              {results.errors && results.errors.length > 0 && (
                <div className="mt-6 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Errors
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {results.errors.map((error: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="/my-people"
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <h4 className="font-medium text-blue-900">My People</h4>
                <p className="text-sm text-blue-600">Test invitation features</p>
              </a>
              <a
                href="/docs"
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h4 className="font-medium text-gray-900">Documentation</h4>
                <p className="text-sm text-gray-600">View API documentation</p>
              </a>
              <a
                href="/admin"
                className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <h4 className="font-medium text-purple-900">Admin Panel</h4>
                <p className="text-sm text-purple-600">System administration</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
