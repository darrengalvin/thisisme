#!/usr/bin/env node

// Test script for VAPI webhooks
// Run with: node test-vapi-webhooks.js

const BASE_URL = 'http://localhost:3000'

async function testWebhook(functionName, parameters, description) {
  console.log(`\n🧪 Testing ${functionName}: ${description}`)
  
  const payload = {
    type: 'function-call',
    functionCall: {
      name: functionName,
      parameters: parameters
    },
    call: {
      id: 'test-call-123',
      customer: { userId: '550e8400-e29b-41d4-a716-446655440000' },
      metadata: { userId: '550e8400-e29b-41d4-a716-446655440000' }
    }
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/vapi/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log(`✅ Status: ${response.status}`)
    console.log(`📝 Response:`, JSON.stringify(result, null, 2))
    
    return result
    
  } catch (error) {
    console.error(`❌ Error testing ${functionName}:`, error.message)
    return null
  }
}

async function runAllTests() {
  console.log('🚀 Starting VAPI Webhook Tests')
  console.log('Make sure your dev server is running on http://localhost:3000')
  
  // Test 1: Get user context (first time user)
  await testWebhook('get-user-context', {
    context_type: 'timeline_overview'
  }, 'Get timeline overview for new user')
  
  // Test 2: Save a memory
  const saveResult = await testWebhook('save-memory', {
    title: 'My Wedding Day',
    content: 'It was a beautiful sunny day in June. We got married in my parents\' garden with all our family and friends. The ceremony was perfect and the reception went on until midnight.',
    age: 28,
    year: 2019,
    location: 'Parents\' garden',
    people: ['Sarah', 'Mom', 'Dad', 'Best man John'],
    sensory_details: 'The smell of roses, sound of laughter, taste of the wedding cake',
    chapter: 'Marriage and Love'
  }, 'Save wedding memory')
  
  // Test 3: Search memories
  await testWebhook('search-memories', {
    query: 'wedding',
    year: 2019
  }, 'Search for wedding memories')
  
  // Test 4: Get user context (with existing memories)
  await testWebhook('get-user-context', {
    age: 28,
    context_type: 'similar_timeframe'
  }, 'Get context for similar age/timeframe')
  
  // Test 5: Save another memory from same period
  await testWebhook('save-memory', {
    title: 'Honeymoon in Italy',
    content: 'Right after the wedding, we flew to Italy for our honeymoon. We spent two weeks exploring Rome, Florence, and Venice. The food was incredible and the sights were breathtaking.',
    age: 28,
    year: 2019,
    location: 'Italy',
    people: ['Sarah'],
    sensory_details: 'Taste of authentic pasta, smell of Italian coffee, sound of gondoliers singing',
    chapter: 'Marriage and Love'
  }, 'Save honeymoon memory')
  
  // Test 6: Search memories by age
  await testWebhook('search-memories', {
    age: 28
  }, 'Search memories by age')
  
  // Test 7: Upload media request
  await testWebhook('upload-media', {
    media_type: 'photos',
    memory_id: 'latest',
    description: 'Wedding photos'
  }, 'Request photo upload for wedding')
  
  // Test 8: Save childhood memory
  await testWebhook('save-memory', {
    title: 'Learning to Ride a Bike',
    content: 'I was 7 years old when Dad taught me to ride a bike in the park. I was scared at first but he held onto the back of the seat. When I realized he had let go and I was riding by myself, I felt so proud!',
    age: 7,
    location: 'Local park',
    people: ['Dad'],
    sensory_details: 'Wind in my hair, feeling of the handlebars, Dad\'s encouraging voice',
    chapter: 'Childhood Adventures'
  }, 'Save childhood memory')
  
  // Test 9: Get timeline overview with multiple periods
  await testWebhook('get-user-context', {
    context_type: 'timeline_overview'
  }, 'Get timeline overview with multiple time periods')
  
  console.log('\n🎉 All webhook tests completed!')
  console.log('\n📋 Summary:')
  console.log('- save-memory: Captures and stores memories with timeline placement')
  console.log('- search-memories: Finds existing memories for organization')
  console.log('- get-user-context: Provides timeline context for better organization')
  console.log('- upload-media: Handles photo/video upload requests')
  console.log('\n✅ Ready to integrate with VAPI!')
}

// Run the tests
runAllTests().catch(console.error)
