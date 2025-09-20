import { NextRequest, NextResponse } from 'next/server';
import { generatePersonInviteTwiML } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    
    console.log('Twilio Voice Webhook received:', { callSid, to, from });
    
    // For now, we'll generate a generic invitation message
    // In a real implementation, you'd look up the person details and customize the message
    const twiml = generatePersonInviteTwiML(
      'there', // personName - would be looked up from database
      'a friend', // inviterName - would be looked up from database  
      'friend' // relationship - would be looked up from database
    );
    
    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error processing Twilio voice webhook:', error);
    
    // Return a simple error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, there was an error processing your call. Please try again later.</Say>
</Response>`;
    
    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests (some webhook configurations use GET)
  return POST(request);
}
