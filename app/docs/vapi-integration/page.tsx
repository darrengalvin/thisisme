import Link from 'next/link'

export default function VAPIIntegrationPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">VAPI Memory Integration</h1>
          <p className="text-xl text-gray-600">
            Complete guide to our Voice AI Platform integration for natural memory capture
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
            <p className="text-gray-700 mb-4">
              We've integrated <strong>VAPI (Voice AI Platform)</strong> to provide real-time voice interaction for memory capture on the "This Is Me" platform. 
              This replaces our previous WebRTC streaming implementation to achieve better performance and more natural conversation flow.
            </p>
          </section>

          {/* Why VAPI */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Why VAPI?</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-red-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-4">Previous WebRTC Challenges</h3>
                <ul className="space-y-2 text-red-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Latency Issues:</strong> 3-5 second delays from speech to AI response</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Complex Pipeline:</strong> Multiple steps (audio capture → Whisper → GPT-4o → TTS → playback)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Hallucination Problems:</strong> Whisper transcribing silence as "bye-bye" or "thank you"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Audio Conflicts:</strong> Multiple TTS responses playing simultaneously</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Maintenance Overhead:</strong> Complex audio queuing and sentence-level streaming logic</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">VAPI Advantages</h3>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Real-Time Performance:</strong> Sub-second response times with optimized voice pipeline</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Professional Voice Quality:</strong> Integrated ElevenLabs TTS with consistent voice</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Robust Speech Recognition:</strong> Better handling of silence and background noise</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Function Calling:</strong> Direct integration with our memory database via webhooks</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span><strong>Simplified Architecture:</strong> VAPI handles the entire voice pipeline</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Architecture */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Architecture</h2>
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 text-blue-800 font-mono text-sm">
                  <span className="bg-blue-100 px-3 py-2 rounded">User Speech</span>
                  <span>→</span>
                  <span className="bg-blue-100 px-3 py-2 rounded">VAPI Platform</span>
                  <span>→</span>
                  <span className="bg-blue-100 px-3 py-2 rounded">Our Webhooks</span>
                  <span>→</span>
                  <span className="bg-blue-100 px-3 py-2 rounded">Database</span>
                  <span>→</span>
                  <span className="bg-blue-100 px-3 py-2 rounded">VAPI Response</span>
                  <span>→</span>
                  <span className="bg-blue-100 px-3 py-2 rounded">User</span>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Components</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">1. VAPI Assistant</h4>
                <p className="text-gray-600">Configured with Maya personality and memory capture prompts</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">2. Webhook Functions</h4>
                <p className="text-gray-600">Handle memory operations (save, search, organize)</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">3. Database Integration</h4>
                <p className="text-gray-600">Store memories with timeline organization</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">4. Frontend Integration</h4>
                <p className="text-gray-600">Simple VAPI SDK integration</p>
              </div>
            </div>
          </section>

          {/* Memory Capture Flow */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Memory Capture Flow</h2>
            
            <div className="space-y-8">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Natural Conversation</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• User speaks naturally about their memory</li>
                  <li>• Maya (AI assistant) listens and asks clarifying questions</li>
                  <li>• Focus on extracting: <strong>WHEN, WHERE, WHO, WHAT</strong></li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Timeline Organization</h3>
                <p className="text-gray-700 mb-2">Maya helps organize memories by:</p>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Age/Year:</strong> "When you were 22..." or "In 2019..."</li>
                  <li>• <strong>Life Chapters:</strong> Grouping related memories (childhood, college, marriage, etc.)</li>
                  <li>• <strong>Context:</strong> Connecting new memories to existing ones</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Memory Enhancement</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Sensory Details:</strong> Natural probing for smells, sounds, feelings</li>
                  <li>• <strong>People:</strong> Who was involved in the memory</li>
                  <li>• <strong>Location:</strong> Where it happened</li>
                  <li>• <strong>Emotional Context:</strong> How it felt, what it meant</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Media Integration</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• Suggest photo/video uploads for memories</li>
                  <li>• Webhook triggers upload interface</li>
                  <li>• Seamless integration with existing media system</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Maya's Personality */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Maya's Personality</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Traits</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Friendly & Natural:</strong> Like talking to a helpful friend</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Efficient:</strong> Short responses (1-2 sentences max)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Focused:</strong> One question at a time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Memory-Oriented:</strong> Always working toward capturing the story</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Style</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Casual Language:</strong> "Cool!" "That sounds fun!" "Nice!"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Not Clinical:</strong> Avoid therapeutic or overly emotional language</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Direct Questions:</strong> "When did this happen?" "Who was with you?"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Natural Flow:</strong> Let users tell their story, then ask for details</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Capture Process</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Listen First</p>
                  <p className="text-xs text-gray-600">Let them share naturally</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Get Timing</p>
                  <p className="text-xs text-gray-600">Most important - when did it happen?</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Get Basics</p>
                  <p className="text-xs text-gray-600">Where, who (only if relevant)</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">4</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Add Details</p>
                  <p className="text-xs text-gray-600">Sensory information when natural</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">5</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Organize</p>
                  <p className="text-xs text-gray-600">Suggest timeline placement</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-semibold">6</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Save</p>
                  <p className="text-xs text-gray-600">Confirm and continue</p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefits for Users</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Improved Experience</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>Faster Interaction:</strong> Real-time conversation flow</li>
                  <li>• <strong>Natural Feel:</strong> Like talking to a friend, not a machine</li>
                  <li>• <strong>Better Organization:</strong> AI helps place memories in timeline context</li>
                  <li>• <strong>Rich Capture:</strong> Encourages sensory details and emotional context</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enhanced Memory Quality</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>Complete Stories:</strong> Guided questions ensure full capture</li>
                  <li>• <strong>Timeline Accuracy:</strong> Focus on when memories happened</li>
                  <li>• <strong>Contextual Connections:</strong> Links to related memories and chapters</li>
                  <li>• <strong>Media Integration:</strong> Easy photo/video attachment</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Steps</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Continue Reading:</h3>
                  <div className="space-y-2">
                    <Link href="/docs/vapi-tools" className="block text-blue-600 hover:text-blue-800">
                      → VAPI Tools Configuration
                    </Link>
                    <Link href="/docs/database-schema" className="block text-blue-600 hover:text-blue-800">
                      → Database Schema Setup
                    </Link>
                    <Link href="/docs/api-testing" className="block text-blue-600 hover:text-blue-800">
                      → API Testing Guide
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3">Quick Actions:</h3>
                  <div className="space-y-2">
                    <p className="text-blue-800">1. Set up database schema</p>
                    <p className="text-blue-800">2. Configure VAPI tools</p>
                    <p className="text-blue-800">3. Test webhook functions</p>
                    <p className="text-blue-800">4. Deploy and launch!</p>
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
