#!/usr/bin/env node
/**
 * Test script to show what webhook URL will be used in different environments
 */

// Simulate different environments
console.log('🧪 VAPI Webhook URL Configuration Test\n');

// Test production environment
process.env.NODE_ENV = 'production';
console.log('🌐 Production Environment:');
delete require.cache[require.resolve('./lib/vapi-config.ts')];
try {
  const { VAPI_CONFIG } = require('./lib/vapi-config.ts');
  console.log(`   URL: ${VAPI_CONFIG.assistant.serverUrl}\n`);
} catch (error) {
  console.log(`   Error: ${error.message}\n`);
}

// Test development environment (default port)
process.env.NODE_ENV = 'development';
delete process.env.NEXT_PUBLIC_WEBHOOK_URL;
delete process.env.PORT;
console.log('💻 Development Environment (default):');
delete require.cache[require.resolve('./lib/vapi-config.ts')];
try {
  const { VAPI_CONFIG } = require('./lib/vapi-config.ts');
  console.log(`   URL: ${VAPI_CONFIG.assistant.serverUrl}\n`);
} catch (error) {
  console.log(`   Error: ${error.message}\n`);
}

// Test with custom port
process.env.PORT = '3002';
console.log('💻 Development Environment (PORT=3002):');
delete require.cache[require.resolve('./lib/vapi-config.ts')];
try {
  const { VAPI_CONFIG } = require('./lib/vapi-config.ts');
  console.log(`   URL: ${VAPI_CONFIG.assistant.serverUrl}\n`);
} catch (error) {
  console.log(`   Error: ${error.message}\n`);
}

// Test with custom webhook URL
process.env.NEXT_PUBLIC_WEBHOOK_URL = 'http://localhost:4000/api/vapi/webhook';
console.log('💻 Development Environment (CUSTOM URL):');
delete require.cache[require.resolve('./lib/vapi-config.ts')];
try {
  const { VAPI_CONFIG } = require('./lib/vapi-config.ts');
  console.log(`   URL: ${VAPI_CONFIG.assistant.serverUrl}\n`);
} catch (error) {
  console.log(`   Error: ${error.message}\n`);
}

console.log('✅ Configuration supports:');
console.log('   - Production: https://thisisme-three.vercel.app');
console.log('   - Development: Any localhost port');
console.log('   - Custom: NEXT_PUBLIC_WEBHOOK_URL environment variable');
console.log('   - Browser: Auto-detects from window.location');
