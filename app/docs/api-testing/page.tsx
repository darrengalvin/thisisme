import Link from 'next/link'

export default function APITestingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Documentation
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">API Testing Guide</h1>
          <p className="text-xl text-gray-600">
            Test your VAPI webhook functions and validate the memory integration
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Overview</h2>
            <p className="text-gray-700 mb-4">
              Before connecting VAPI to your webhook functions, it's important to test each function individually to ensure they work correctly. 
              This guide provides comprehensive testing methods and troubleshooting tips.
            </p>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">Test Script Available</span>
              </div>
              <p className="text-green-700 mt-2">
                We've created an automated test script that validates all webhook functions with sample data.
              </p>
            </div>
          </section>

          {/* Quick Test */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Test (Recommended)</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Run the Test Script</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-4">
                <code>node test-vapi-webhooks.js</code>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What it tests:</h4>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• All 4 webhook functions</li>
                    <li>• Database connectivity</li>
                    <li>• Memory saving and retrieval</li>
                    <li>• Search functionality</li>
                    <li>• User context queries</li>
                    <li>• Media upload handling</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Expected output:</h4>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• ✅ Status: 200 for all tests</li>
                    <li>• 📝 JSON responses with results</li>
                    <li>• 🎉 "All webhook tests completed!"</li>
                    <li>• No error messages</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Individual Function Tests */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Individual Function Tests</h2>
            
            <div className="space-y-8">
              {/* save-memory test */}
              <div className="border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Testing save-memory</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Request:</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/vapi/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "function-call",
    "functionCall": {
      "name": "save-memory",
      "parameters": {
        "title": "My First Day at School",
        "content": "I was 5 years old and so nervous about starting kindergarten. My mom walked me to the classroom and I remember the smell of crayons and the colorful alphabet on the walls.",
        "age": 5,
        "location": "Elementary School",
        "people": ["Mom", "Mrs. Johnson"],
        "sensory_details": "Smell of crayons, colorful alphabet on walls",
        "chapter": "Early Childhood"
      }
    },
    "call": {
      "id": "test-call-123",
      "customer": { "userId": "test-user-456" }
    }
  }'`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Expected Response:</h4>
                  <pre className="bg-green-50 text-green-800 p-4 rounded-lg text-sm">
{`{
  "result": "Perfect! I've saved 'My First Day at School' to your timeline around age 5. It's in your Early Childhood chapter. What else would you like to share?",
  "memoryId": "uuid-here",
  "success": true
}`}
                  </pre>
                </div>
              </div>

              {/* search-memories test */}
              <div className="border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Testing search-memories</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Request:</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/vapi/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "function-call",
    "functionCall": {
      "name": "search-memories",
      "parameters": {
        "query": "school",
        "age": 16
      }
    },
    "call": {
      "id": "test-call-123",
      "customer": { "userId": "test-user-456" }
    }
  }'`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Expected Response:</h4>
                  <pre className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
{`{
  "result": "I found 2 related memories: 'Learning to Drive' (Age 16), 'High School Graduation' (Age 18). Does your new memory connect to any of these?",
  "memories": [...],
  "suggested_action": "organize_with_existing"
}`}
                  </pre>
                </div>
              </div>

              {/* get-user-context test */}
              <div className="border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Testing get-user-context</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Request:</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/vapi/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "function-call",
    "functionCall": {
      "name": "get-user-context",
      "parameters": {
        "context_type": "timeline_overview"
      }
    },
    "call": {
      "id": "test-call-123",
      "customer": { "userId": "test-user-456" }
    }
  }'`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Expected Response:</h4>
                  <pre className="bg-purple-50 text-purple-800 p-4 rounded-lg text-sm">
{`{
  "result": "You have 3 memories in your timeline. What new memory would you like to add?",
  "memory_count": 3
}`}
                  </pre>
                </div>
              </div>

              {/* upload-media test */}
              <div className="border border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Testing upload-media</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Request:</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/vapi/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "function-call",
    "functionCall": {
      "name": "upload-media",
      "parameters": {
        "media_type": "photos",
        "memory_id": "latest",
        "description": "School photos from first day"
      }
    },
    "call": {
      "id": "test-call-123",
      "customer": { "userId": "test-user-456" }
    }
  }'`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Expected Response:</h4>
                  <pre className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm">
{`{
  "result": "Great! You can upload photos by visiting your memory timeline and clicking the photo icon on this memory. I've noted that you want to add photos to this memory.",
  "upload_url": "/memories/latest/upload",
  "media_type": "photos",
  "memory_id": "latest",
  "action_required": "redirect_to_upload"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Common Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Issues & Solutions</h2>
            
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-4">❌ Connection Refused (ECONNREFUSED)</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Problem:</h4>
                    <p className="text-red-700 text-sm">Your development server isn't running</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Solution:</h4>
                    <div className="bg-red-100 rounded p-2">
                      <code className="text-red-800 text-sm">npm run dev</code>
                    </div>
                    <p className="text-red-600 text-xs mt-1">Make sure server is running on port 3000</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ Database Connection Error</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Problem:</h4>
                    <p className="text-yellow-700 text-sm">Supabase connection issues or missing environment variables</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Solution:</h4>
                    <ul className="text-yellow-700 text-sm space-y-1">
                      <li>• Check .env.local file exists</li>
                      <li>• Verify SUPABASE_URL and SUPABASE_ANON_KEY</li>
                      <li>• Ensure database schema is applied</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">ℹ️ Function Not Found</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Problem:</h4>
                    <p className="text-blue-700 text-sm">Webhook function name doesn't match</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Solution:</h4>
                    <p className="text-blue-700 text-sm">Check function names in webhook handler match exactly:</p>
                    <ul className="text-blue-600 text-xs space-y-1 mt-2">
                      <li>• save-memory</li>
                      <li>• search-memories</li>
                      <li>• get-user-context</li>
                      <li>• upload-media</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Success Indicators</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">All tests should show:</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Status: 200</li>
                      <li>• JSON response with "result" field</li>
                      <li>• No error messages</li>
                      <li>• Appropriate response content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Database should contain:</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Test user (test-user-456)</li>
                      <li>• Sample memories</li>
                      <li>• New memories from tests</li>
                      <li>• Proper timestamps</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Manual Database Verification */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Manual Database Verification</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify Data in Supabase</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">1. Check Test User Exists:</h4>
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-sm">
                    <code>SELECT * FROM users WHERE id = 'test-user-456';</code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">2. Check Sample Memories:</h4>
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-sm">
                    <code>SELECT title, approximate_date FROM memories WHERE user_id = 'test-user-456';</code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">3. Check New Memories from Tests:</h4>
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-sm">
                    <code>SELECT * FROM memories ORDER BY created_at DESC LIMIT 5;</code>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Testing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Testing</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Times</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-green-800">save-memory</span>
                    <span className="text-green-600 font-mono text-sm">&lt; 500ms</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-blue-800">search-memories</span>
                    <span className="text-blue-600 font-mono text-sm">&lt; 300ms</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="text-purple-800">get-user-context</span>
                    <span className="text-purple-600 font-mono text-sm">&lt; 200ms</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-orange-800">upload-media</span>
                    <span className="text-orange-600 font-mono text-sm">&lt; 100ms</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Load Testing</h3>
                <p className="text-gray-700 text-sm mb-4">
                  For production deployment, consider testing with multiple concurrent requests:
                </p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm">
                  <code>
                    # Run 10 concurrent tests<br/>
                    for i in {`{1..10}`}; do<br/>
                    &nbsp;&nbsp;node test-vapi-webhooks.js &<br/>
                    done<br/>
                    wait
                  </code>
                </div>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Steps</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Testing Complete ✅</h3>
                  <p className="text-blue-800 text-sm mb-3">Your webhook functions are working correctly!</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
                    <li>Configure VAPI assistant</li>
                    <li>Add webhook URL to VAPI</li>
                    <li>Test with real voice conversations</li>
                    <li>Deploy to production</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Continue Reading:</h3>
                  <div className="space-y-2">
                    <Link href="/docs/vapi-tools" className="block text-blue-600 hover:text-blue-800">
                      → VAPI Tools Configuration
                    </Link>
                    <Link href="/docs/vapi-integration" className="block text-blue-600 hover:text-blue-800">
                      → VAPI Integration Overview
                    </Link>
                    <Link href="/docs/database-schema" className="block text-blue-600 hover:text-blue-800">
                      → Database Schema
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
