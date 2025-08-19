// Simple Node.js webhook forwarder for VAPI
// Deploy this to a free service like Railway, Render, or Netlify Functions

const https = require('https');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Forward the webhook to your protected Vercel deployment
    const webhookData = JSON.parse(event.body);
    
    // Extract user ID from the webhook data
    const userId = webhookData.call?.customer?.userId || 
                   webhookData.call?.metadata?.userId || 
                   'unknown';

    // Forward to your protected endpoint with authentication
    const response = await fetch(`https://thisisme-m2ku5utm7-darrengalvins-projects.vercel.app/api/vapi/webhook?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers your app needs
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
      },
      body: event.body
    });

    const result = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Webhook forwarding error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
