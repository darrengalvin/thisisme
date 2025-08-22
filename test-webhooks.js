#!/usr/bin/env node
/**
 * Test script to verify VAPI webhooks work in both local and production environments
 */

const https = require('https');
const http = require('http');

const testPayload = {
  type: 'function-call',
  call: {
    id: 'test-call-123',
    customer: {
      userId: 'test-user-456'
    }
  },
  functionCall: {
    name: 'save-conversation',
    parameters: {
      conversation_summary: 'Test conversation summary for webhook testing',
      userId: 'test-user-456'
    }
  }
};

async function testWebhook(url, label) {
  console.log(`\n🧪 Testing ${label}: ${url}`);
  
  const isHttps = url.startsWith('https://');
  const urlObj = new URL(url);
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'VAPI-Webhook-Test/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const lib = isHttps ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${label} responded: ${res.statusCode}`);
        console.log(`📝 Response: ${data.substring(0, 100)}...`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${label} failed: ${err.message}`);
      reject(err);
    });

    req.write(JSON.stringify(testPayload));
    req.end();
  });
}

async function runTests() {
  console.log('🎯 VAPI Webhook Testing Suite');
  console.log('=====================================');

  const endpoints = [
    { url: 'http://localhost:3000/api/vapi/webhook', label: 'Local Dev (3000)' },
    { url: 'http://localhost:3001/api/vapi/webhook', label: 'Local Dev (3001)' },
    { url: 'https://thisisme-three.vercel.app/api/vapi/webhook', label: 'Production' }
  ];

  for (const endpoint of endpoints) {
    try {
      await testWebhook(endpoint.url, endpoint.label);
    } catch (error) {
      console.log(`⚠️ ${endpoint.label} is not available`);
    }
  }

  console.log('\n🎉 Webhook testing complete!');
  console.log('\n💡 Tips:');
  console.log('- Local dev should respond if Next.js is running');
  console.log('- Production should always respond');
  console.log('- VAPI will use the URL configured in lib/vapi-config.ts');
}

runTests().catch(console.error);
