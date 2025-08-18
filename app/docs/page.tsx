import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            This Is Me - Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Complete documentation for VAPI memory integration and voice assistant setup
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* VAPI Integration Overview */}
          <Link href="/docs/vapi-integration" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  VAPI Integration Overview
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Complete guide to our VAPI voice AI integration, including architecture, benefits, and Maya's personality design.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Architecture</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Benefits</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Maya AI</span>
              </div>
            </div>
          </Link>

          {/* VAPI Tools Configuration */}
          <Link href="/docs/vapi-tools" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-600">
                  VAPI Tools Configuration
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Detailed setup guide for VAPI webhook functions, including JSON schemas, examples, and best practices.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Webhooks</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">JSON Schemas</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Examples</span>
              </div>
            </div>
          </Link>

          {/* Database Schema */}
          <Link href="/docs/database-schema" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s8-1.79 8-4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600">
                  Database Schema
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Complete Supabase database schema with tables, indexes, RLS policies, and sample data for VAPI integration.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Supabase</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">SQL</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">RLS</span>
              </div>
            </div>
          </Link>

          {/* API Testing */}
          <Link href="/docs/api-testing" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-orange-600">
                  API Testing Guide
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Test your VAPI webhook functions with sample data, troubleshooting tips, and validation scripts.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Testing</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Validation</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Debug</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Start Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guide</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Database Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Run the Supabase SQL schema</li>
                <li>Verify tables and policies are created</li>
                <li>Test with sample data</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">2. VAPI Configuration</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Configure the 4 webhook functions</li>
                <li>Set webhook URL to your API endpoint</li>
                <li>Test with Maya's personality prompt</li>
              </ol>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              <strong>Webhook URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded">https://yourdomain.com/api/vapi/webhook</code>
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">VAPI Integration Ready</span>
          </div>
          <p className="text-green-700 mt-2">
            All webhook functions are implemented and tested. Database schema is compatible with existing systems.
          </p>
        </div>
      </div>
    </div>
  )
}
