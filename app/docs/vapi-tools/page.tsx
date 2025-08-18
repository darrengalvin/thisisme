import Link from 'next/link'

export default function VAPIToolsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">VAPI Tools Configuration</h1>
          <p className="text-xl text-gray-600">
            Complete setup guide for VAPI webhook functions and Maya's memory tools
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
            <p className="text-gray-700 mb-4">
              This document explains how to configure the <strong>VAPI Tools (Function Calling)</strong> for the Maya memory assistant. 
              These tools allow VAPI to interact with your database and perform memory operations during voice conversations.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Production Webhook URL:</h3>
                <code className="bg-blue-100 px-2 py-1 rounded text-sm text-blue-800 break-all">
                  https://thisisme-three.vercel.app/api/vapi/webhook
                </code>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">How VAPI Function Calling Works:</h3>
                <p className="text-green-700 text-sm">VAPI sends structured JSON requests to your webhook when Maya needs to save memories or search data.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">VAPI Request Structure</h3>
              <p className="text-gray-700 mb-3">When Maya calls a function, VAPI sends this exact format to your webhook:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "function-call",
  "functionCall": {
    "name": "save-memory",
    "parameters": {
      "title": "My Wedding Day",
      "content": "It was a beautiful sunny day...",
      "age": 28,
      "location": "Garden"
    }
  },
  "call": {
    "id": "call-123",
    "customer": { "userId": "user-456" },
    "metadata": { "userId": "user-456" }
  }
}`}
              </pre>
              <p className="text-gray-600 mt-3 text-sm">
                Your webhook extracts the function name and parameters, processes the request, and returns a JSON response with a "result" field that Maya speaks to the user.
              </p>
            </div>
          </section>

          {/* Tool 1: save-memory */}
          <section className="mb-12">
            <div className="border-l-4 border-green-500 pl-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tool 1: save-memory</h2>
              <p className="text-gray-600">Captures and stores a user's memory in the database with timeline organization.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Function Schema (Copy to VAPI)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "name": "save-memory",
  "description": "Save a user's memory to their timeline with proper organization and details",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "A brief, descriptive title for the memory (e.g., 'My Wedding Day', 'Learning to Drive')"
      },
      "content": {
        "type": "string",
        "description": "The full memory story as told by the user, including all details they shared"
      },
      "age": {
        "type": "integer",
        "description": "How old the user was when this memory happened (most important for timeline placement)"
      },
      "year": {
        "type": "integer",
        "description": "The specific year this memory happened (if known exactly)"
      },
      "location": {
        "type": "string",
        "description": "Where this memory took place (city, venue, general location)"
      },
      "people": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Names of people who were involved in this memory"
      },
      "sensory_details": {
        "type": "string",
        "description": "Sensory information like smells, sounds, feelings, tastes that the user mentioned"
      },
      "chapter": {
        "type": "string",
        "description": "Life chapter or theme this memory belongs to (e.g., 'Childhood', 'College Years', 'Marriage')"
      }
    },
    "required": ["title", "content"]
  }
}`}
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">When to Use:</h4>
                <p className="text-gray-700">After gathering enough details about a memory and the user is ready to save it.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Example Response:</h4>
                <p className="text-gray-700 italic">"Perfect! I've saved 'Learning to Ride a Bike' to your timeline around age 7. It's in your Childhood Adventures chapter."</p>
              </div>
            </div>
          </section>

          {/* Tool 2: search-memories */}
          <section className="mb-12">
            <div className="border-l-4 border-blue-500 pl-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tool 2: search-memories</h2>
              <p className="text-gray-600">Searches existing memories to help organize new ones and avoid duplicates.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Function Schema (Copy to VAPI)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "name": "search-memories",
  "description": "Search the user's existing memories to find related ones for better organization",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search term to look for in memory titles and content (e.g., 'wedding', 'school', 'vacation')"
      },
      "timeframe": {
        "type": "string",
        "description": "General time period to search (e.g., 'childhood', 'teenage years', 'college')"
      },
      "age": {
        "type": "integer",
        "description": "Specific age to search memories from"
      },
      "year": {
        "type": "integer",
        "description": "Specific year to search memories from"
      },
      "chapter_name": {
        "type": "string",
        "description": "Name of a life chapter to search within"
      }
    },
    "required": []
  }
}`}
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">When to Use:</h4>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• Before saving a new memory to check for similar ones</li>
                  <li>• When user mentions something that might connect to existing memories</li>
                  <li>• To help organize memories into chapters</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Example Response:</h4>
                <p className="text-gray-700 italic">"I found 3 related memories: 'Wedding Planning', 'Engagement Party'. Does your new memory connect to any of these?"</p>
              </div>
            </div>
          </section>

          {/* Tool 3: get-user-context */}
          <section className="mb-12">
            <div className="border-l-4 border-purple-500 pl-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tool 3: get-user-context</h2>
              <p className="text-gray-600">Gets information about the user's timeline and existing chapters for better organization.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Function Schema (Copy to VAPI)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "name": "get-user-context",
  "description": "Get context about the user's timeline and existing memories for better organization",
  "parameters": {
    "type": "object",
    "properties": {
      "age": {
        "type": "integer",
        "description": "Age period to get context for"
      },
      "year": {
        "type": "integer",
        "description": "Year to get context for"
      },
      "context_type": {
        "type": "string",
        "enum": ["timeline_overview", "similar_timeframe", "chapter_suggestions"],
        "description": "Type of context needed: overview of all chapters, similar time periods, or chapter suggestions"
      }
    },
    "required": []
  }
}`}
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">When to Use:</h4>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• At the start of conversations to understand their timeline</li>
                  <li>• When placing memories in timeline context</li>
                  <li>• To suggest appropriate chapters for new memories</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Example Response:</h4>
                <p className="text-gray-700 italic">"You have memories organized in 5 time periods: Childhood, College Years, Early Career. What time period is your new memory from?"</p>
              </div>
            </div>
          </section>

          {/* Tool 4: upload-media */}
          <section className="mb-12">
            <div className="border-l-4 border-orange-500 pl-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tool 4: upload-media</h2>
              <p className="text-gray-600">Handles requests to upload photos, videos, or documents to memories.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Function Schema (Copy to VAPI)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "name": "upload-media",
  "description": "Handle user requests to upload photos, videos, or documents to their memories",
  "parameters": {
    "type": "object",
    "properties": {
      "media_type": {
        "type": "string",
        "enum": ["photos", "videos", "documents"],
        "description": "Type of media the user wants to upload"
      },
      "memory_id": {
        "type": "string",
        "description": "ID of the memory to attach media to (use 'latest' for the most recently saved memory)"
      },
      "description": {
        "type": "string",
        "description": "Description of the media they want to upload"
      }
    },
    "required": ["media_type"]
  }
}`}
              </pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">When to Use:</h4>
                <p className="text-gray-700">When user mentions wanting to add photos, videos, or documents to a memory.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Example Response:</h4>
                <p className="text-gray-700 italic">"Great! You can upload photos by visiting your memory timeline and clicking the photo icon on this memory."</p>
              </div>
            </div>
          </section>

          {/* Conversation Flow Example */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Conversation Flow Example</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Saving a Childhood Memory</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">User:</p>
                    <p className="text-gray-700">"I remember when I was about 8 years old, my mom took me to Disney World for the first time."</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">Maya:</p>
                    <p className="text-gray-700">"That sounds magical! Tell me more about that Disney World trip."</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">User:</p>
                    <p className="text-gray-700">"It was amazing. We went on Space Mountain and I was so scared but excited. The whole park smelled like popcorn and I remember getting Mickey Mouse ears."</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium mb-2">Maya calls: save-memory</p>
                  <pre className="text-xs text-yellow-700 overflow-x-auto">
{`{
  "title": "First Trip to Disney World",
  "content": "When I was 8 years old, my mom took me to Disney World for the first time. It was amazing. We went on Space Mountain and I was so scared but excited. The whole park smelled like popcorn and I remember getting Mickey Mouse ears.",
  "age": 8,
  "year": 1995,
  "location": "Disney World",
  "people": ["Mom"],
  "sensory_details": "Smell of popcorn, feeling scared but excited on Space Mountain",
  "chapter": "Childhood Adventures"
}`}
                  </pre>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">Maya:</p>
                    <p className="text-gray-700">"Perfect! I've saved your Disney World memory to your timeline around age 8 in 1995. It's in your Childhood Adventures chapter. Got any photos from that trip you'd like to add?"</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tool Usage Guidelines</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Always get timing first</strong> - Use age or year for proper timeline placement</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Search before saving</strong> - Use search-memories to check for related memories</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Get context when needed</strong> - Use get-user-context for timeline organization</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Offer media uploads</strong> - Use upload-media when appropriate</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Tips</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>One tool at a time</strong> - Don't call multiple tools simultaneously</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Confirm before saving</strong> - Always confirm details with user before calling save-memory</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Natural flow</strong> - Let conversation flow naturally, don't force tool usage</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Short responses</strong> - Keep Maya's responses brief and conversational</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Testing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Your Tools</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Use the provided test script to verify your webhook functions work correctly:
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg">
                <code>node test-vapi-webhooks.js</code>
              </div>
              <p className="text-gray-600 mt-4 text-sm">
                This will test all 4 tools with sample data and show you the responses.
              </p>
            </div>
          </section>

          {/* VAPI Dashboard Setup */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">VAPI Dashboard Setup Guide</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step VAPI Configuration</h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">1</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Create/Edit Your Assistant</h4>
                    <p className="text-gray-700 text-sm">In your VAPI dashboard, go to Assistants and create a new assistant or edit your existing Maya assistant.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">2</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Set Webhook URL</h4>
                    <p className="text-gray-700 text-sm mb-2">In the "Server URL" field, paste:</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">https://thisisme-three.vercel.app/api/vapi/webhook</code>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">3</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Add Functions</h4>
                    <p className="text-gray-700 text-sm">In the "Functions" section, click "Add Function" and copy-paste each JSON schema below (one at a time).</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">4</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Configure Voice & Model</h4>
                    <p className="text-gray-700 text-sm">Set your ElevenLabs voice ID and choose GPT-4o-mini for optimal performance.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">5</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Test Your Setup</h4>
                    <p className="text-gray-700 text-sm">Use VAPI's test interface to verify Maya can call your functions and save memories.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-yellow-800">Important Notes</span>
              </div>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Make sure to enable "Function Calling" in your assistant settings</li>
                <li>• Set the webhook timeout to at least 30 seconds for database operations</li>
                <li>• Test each function individually before going live</li>
                <li>• Your Supabase database must be set up before testing</li>
              </ul>
            </div>
          </section>

          {/* Response Format */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Webhook Response Format</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected Response Structure</h3>
              <p className="text-gray-700 mb-3">Your webhook must return JSON in this format for Maya to speak the response:</p>
              
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto mb-4">
{`{
  "result": "Perfect! I've saved 'My Wedding Day' to your timeline around age 28. It's in your Marriage chapter. What else would you like to share?"
}`}
              </pre>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">✅ Success Response</h4>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Always include "result" field</li>
                    <li>• Keep responses conversational</li>
                    <li>• Confirm what was saved/found</li>
                    <li>• Ask follow-up questions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">❌ Error Response</h4>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Still include "result" field</li>
                    <li>• Don't expose technical errors</li>
                    <li>• Suggest alternative actions</li>
                    <li>• Keep Maya's personality</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Testing Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Testing Your Functions</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Testing</h3>
                <p className="text-gray-700 text-sm mb-3">Use our test script to validate all functions:</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm mb-3">
                  <code>node test-vapi-webhooks.js</code>
                </div>
                <p className="text-gray-600 text-xs">This tests all 4 functions with sample data and shows you the exact responses Maya will give.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Testing</h3>
                <p className="text-gray-700 text-sm mb-3">Test individual functions with curl:</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm mb-3">
                  <code className="text-xs">curl -X POST [webhook-url] -H "Content-Type: application/json" -d '[json-payload]'</code>
                </div>
                <p className="text-gray-600 text-xs">See the API Testing Guide for complete curl examples.</p>
              </div>
            </div>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ Successful Test Indicators</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-green-700 font-medium">HTTP Status</p>
                  <p className="text-green-600">200 OK</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Response Format</p>
                  <p className="text-green-600">JSON with "result" field</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Database</p>
                  <p className="text-green-600">Memory saved/retrieved correctly</p>
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
                  <h3 className="font-semibold text-blue-900 mb-3">Configuration Checklist:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>✅ Copy each JSON schema to VAPI dashboard</li>
                    <li>✅ Set webhook URL in VAPI assistant settings</li>
                    <li>✅ Enable function calling in assistant</li>
                    <li>✅ Test each function with sample data</li>
                    <li>✅ Configure Maya's personality prompt</li>
                    <li>✅ Set up Supabase database schema</li>
                    <li>🚀 Go live with voice memory capture!</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Continue Reading:</h3>
                  <div className="space-y-2">
                    <Link href="/docs/database-schema" className="block text-blue-600 hover:text-blue-800">
                      → Database Schema Setup
                    </Link>
                    <Link href="/docs/api-testing" className="block text-blue-600 hover:text-blue-800">
                      → API Testing Guide
                    </Link>
                    <Link href="/docs/vapi-integration" className="block text-blue-600 hover:text-blue-800">
                      → Back to VAPI Integration Overview
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
