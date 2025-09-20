import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface TwilioSMSOptions {
  to: string;
  body: string;
  from?: string;
}

export interface TwilioVoiceOptions {
  to: string;
  from?: string;
  url?: string;
  method?: 'GET' | 'POST';
}

export async function sendSMS(options: TwilioSMSOptions) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio credentials not configured');
    return null;
  }

  try {
    const message = await client.messages.create({
      body: options.body,
      from: options.from || process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });

    return message;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    throw error;
  }
}

export async function makeVoiceCall(options: TwilioVoiceOptions) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio credentials not configured');
    return null;
  }

  try {
    const call = await client.calls.create({
      to: options.to,
      from: options.from || process.env.TWILIO_PHONE_NUMBER,
      url: options.url || process.env.TWILIO_WEBHOOK_URL || 'https://demo.twilio.com/welcome/voice/',
      method: options.method || 'POST',
    });

    return call;
  } catch (error) {
    console.error('Error making voice call via Twilio:', error);
    throw error;
  }
}

export async function sendPersonInviteSMS(
  personName: string,
  personPhone: string,
  inviterName: string,
  relationship: string,
  customMessage?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const message = `Hi ${personName}! ${inviterName} (your ${relationship}) invited you to join This Is Me - a memory collaboration platform. ${customMessage ? `"${customMessage}" ` : ''}Join: ${appUrl}`;

  return sendSMS({
    to: personPhone,
    body: message,
  });
}

export async function sendPersonInviteVoice(
  personName: string,
  personPhone: string,
  inviterName: string,
  relationship: string
) {
  // Create a webhook URL that will handle the voice call
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/twilio/voice`;
  
  return makeVoiceCall({
    to: personPhone,
    url: webhookUrl,
  });
}

// TwiML response for voice calls
export function generateVoiceTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Pause length="2"/>
  <Say voice="alice">Thank you for your time. Goodbye.</Say>
</Response>`;
}

// TwiML response for person invitation voice call
export function generatePersonInviteTwiML(
  personName: string,
  inviterName: string,
  relationship: string
): string {
  const message = `Hello ${personName}. This is an automated call from This Is Me. ${inviterName}, your ${relationship}, has invited you to join our memory collaboration platform. You can share and collaborate on memories together. Please check your email or text messages for the invitation link.`;
  
  return generateVoiceTwiML(message);
}
