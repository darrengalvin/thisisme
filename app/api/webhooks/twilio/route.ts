import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    
    console.log('Twilio Webhook received:', { 
      messageSid, 
      messageStatus, 
      to, 
      from, 
      body: body?.substring(0, 100) + '...' 
    });
    
    // Handle different webhook types
    if (messageSid) {
      // SMS webhook
      await handleSMSWebhook({
        messageSid,
        messageStatus,
        to,
        from,
        body,
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSMSWebhook(data: {
  messageSid: string;
  messageStatus: string;
  to: string;
  from: string;
  body: string;
}) {
  console.log('Processing SMS webhook:', data);
  
  // Here you could:
  // 1. Update message status in your database
  // 2. Process incoming SMS messages
  // 3. Send automated responses
  // 4. Log analytics data
  
  switch (data.messageStatus) {
    case 'delivered':
      console.log(`SMS ${data.messageSid} delivered to ${data.to}`);
      break;
    case 'failed':
      console.log(`SMS ${data.messageSid} failed to deliver to ${data.to}`);
      break;
    case 'sent':
      console.log(`SMS ${data.messageSid} sent to ${data.to}`);
      break;
    default:
      console.log(`SMS ${data.messageSid} status: ${data.messageStatus}`);
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests
  return NextResponse.json({ message: 'Twilio webhook endpoint' });
}
