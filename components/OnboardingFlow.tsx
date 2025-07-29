import { useState } from 'react'
import { Clock, Plus, Lightbulb, MapPin, Calendar, ChevronRight, Star, Sparkles, Mail } from 'lucide-react'

interface OnboardingFlowProps {
  onStartCreating: () => void
}

export default function OnboardingFlow({ onStartCreating }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showWizardSignup, setShowWizardSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  const steps = [
    {
      title: "Welcome to Your Memory Tree",
      content: "You decided to start using Memory Tree because you want to organise all your memories into a living, growing timeline. Like branches on a tree, each memory adds to your life's story, creating a beautiful structure of your journey.",
      icon: "🌳",
      gradient: "from-emerald-600 to-green-700"
    },
    {
      title: "Why Grow Your Memory Tree?",
      content: "Watch your life story branch and flourish over time. Find forgotten moments nestled in the canopy, remember important milestones, share your growing tree with loved ones, and create a living legacy that gets richer with each memory you add.",
      icon: "🌱",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "Choose Your Path",
      content: "Start creating memories right away with Quick Drop, or join the waiting list for our upcoming AI-powered Memory Wizard that will intelligently help your tree grow and flourish automatically.",
      icon: "🌿",
      gradient: "from-teal-600 to-emerald-600"
    }
  ]

  const currentStepData = steps[currentStep]

  const handleWizardSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    
    // TODO: Send email to your backend/mailing list service
    console.log('Wizard waitlist signup:', email)
    setEmailSubmitted(true)
    
    // Simulate API call
    setTimeout(() => {
      setShowWizardSignup(false)
      setEmailSubmitted(false)
      setEmail('')
    }, 2000)
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-green-50 via-amber-50 to-emerald-50">
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                      index <= currentStep 
                        ? 'bg-emerald-600 border-emerald-600' 
                        : 'bg-white border-amber-300'
                    }`}
                  />
                  {index < steps.length - 1 && (
                    <div 
                      className={`w-8 h-1 mx-2 rounded-full transition-all duration-300 ${
                        index < currentStep ? 'bg-emerald-600' : 'bg-amber-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="mb-8">
            <div className={`w-28 h-28 bg-gradient-to-br ${currentStepData.gradient} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white`}>
              <span className="text-4xl">{currentStepData.icon}</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {currentStepData.title}
            </h2>
            
            <p className="text-lg text-gray-700 leading-relaxed mb-8 max-w-xl mx-auto">
              {currentStepData.content}
            </p>
          </div>

          {/* Memory Prompts */}
          {currentStep === steps.length - 1 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                🌱 Let's create your first memory
              </h3>
              <p className="text-gray-700 mb-6 max-w-xl mx-auto">
                "Today I started using Memory Tree to grow my collection of memories" - that's already the first entry in your timeline! 
                Now choose how you'd like to continue building...
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Quick Drop Option */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-emerald-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="text-4xl mb-3">🍃</div>
                  <h4 className="font-bold text-gray-900 mb-2">Quick Drop</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    Just add a memory that's on your mind right now. Don't worry about details - you can organise it and add more later.
                  </p>
                  <button 
                    onClick={onStartCreating}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-700 text-white py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-green-800 transition-all duration-200 shadow-md"
                  >
                    Create Memory
                  </button>
                </div>

                {/* AI Memory Wizard Option */}
                <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 relative">
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-md">
                    Growing Soon
                  </div>
                  <div className="text-4xl mb-3">
                    <div className="flex items-center justify-center space-x-1">
                      <span>🤖</span>
                      <span className="text-amber-600">✨</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">AI Memory Assistant</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    Revolutionary AI that will help organise your memory tree, with intelligent sorting and discovering forgotten memories. Join the waitlist!
                  </p>
                  <button 
                    onClick={() => setShowWizardSignup(true)}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-md"
                  >
                    Join Waitlist
                  </button>
                </div>
              </div>

              {/* Memory Ideas */}
              <div className="mt-8 p-6 bg-white/70 rounded-2xl max-w-2xl mx-auto border border-emerald-200 shadow-lg">
                <h5 className="font-medium text-gray-900 mb-4 text-center flex items-center justify-center space-x-2">
                  <span>🌳</span>
                  <span>Memory branches to help your tree grow:</span>
                </h5>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  {[
                    "🏠 New home", "💼 New job", "🎓 Graduation", "💑 Relationships", 
                    "🚗 First car", "✈️ Travel", "🎉 Celebrations", "👶 Family milestones",
                    "🏆 Achievements", "🌧️ Difficult times", "🎯 Goals reached", "📱 Tech memories"
                  ].map((event, index) => (
                    <span key={index} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      {event}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600 text-center mt-4 flex items-center justify-center space-x-1">
                  <span>🤖</span>
                  <span>The AI Gardener will help these memories flourish automatically when it's ready!</span>
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-center space-x-4">
            {currentStep < steps.length - 1 ? (
              <>
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-gradient-to-r from-emerald-600 to-green-700 text-white flex items-center space-x-2 px-8 py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-green-800 transition-all duration-200 shadow-lg"
                >
                  <span>Continue Learning</span>
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={onStartCreating}
                  className="border-2 border-emerald-600 text-emerald-700 px-6 py-3 rounded-xl font-medium hover:bg-emerald-50 transition-all duration-200"
                >
                  Skip - Start Creating Now
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Start with Quick Drop to begin building your memory tree immediately, or join the AI Memory Assistant waitlist to be notified when our intelligent memory organiser is ready to help structure your tree.
                </p>
              </div>
            )}
          </div>

          {/* Additional Context */}
          {currentStep === 0 && (
            <div className="mt-12 p-6 bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl max-w-xl mx-auto border border-emerald-200 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                <span className="text-emerald-700 text-2xl">🌟</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">What's in it for you?</h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p>🌱 <strong>Watch your life story grow</strong> - each memory strengthens your tree</p>
                <p>📅 <strong>Never forget important dates</strong> - anniversaries, achievements, milestones</p>
                <p>👨‍👩‍👧‍👦 <strong>Share your growing tree</strong> - with family, friends, or future generations</p>
                <p>🔍 <strong>Discover growth patterns</strong> - see how your branches have expanded over time</p>
              </div>
            </div>
          )}

          {/* Benefits Context */}
          {currentStep === 1 && (
            <div className="mt-12 p-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl max-w-xl mx-auto border border-amber-200 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                <span className="text-amber-700 text-2xl">💡</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Think about it...</h4>
              <p className="text-sm text-gray-700">
                How many precious moments have withered away in forgotten corners? How many photos are buried like seeds that never sprouted? 
                Memory Tree helps you cultivate and nurture what truly matters before it's lost forever.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Wizard Signup Modal */}
      {showWizardSignup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-emerald-200">
            {emailSubmitted ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">You're on the list!</h3>
                <p className="text-gray-600">We'll notify you when the AI Memory Assistant is ready to help organise your tree.</p>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI Memory Assistant</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Get early access to our AI-powered assistant that will:
                  </p>
                </div>
                
                <div className="space-y-3 mb-6 text-sm text-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-600">🌳</span>
                    <span>Intelligently organise your memories into thematic branches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-600">💡</span>
                    <span>Suggest forgotten memories to expand your collection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600">✨</span>
                    <span>Enhance memories with context and missing details</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-orange-600">🔍</span>
                    <span>Find patterns and insights in your life's journey</span>
                  </div>
                </div>

                <form onSubmit={handleWizardSignup} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowWizardSignup(false)}
                      className="flex-1 border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl font-medium hover:bg-emerald-50 transition-all duration-200"
                    >
                      Maybe Later
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 text-white py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Mail size={16} />
                      <span>Join Waitlist</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 