// @ts-ignore
const twilio = require('twilio');

const getTwilioClient = () => {
  console.log('🔧 TWILIO DEBUG: Environment variables check:', {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    accountSidStart: process.env.TWILIO_ACCOUNT_SID?.substring(0, 5),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  });
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('❌ TWILIO DEBUG: Missing credentials, returning null');
    return null;
  }
  
  console.log('✅ TWILIO DEBUG: Creating Twilio client');
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
};

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
  console.log('📱 SMS DEBUG: Starting SMS send with options:', {
    to: options.to,
    body: options.body?.substring(0, 50) + '...',
    from: options.from || process.env.TWILIO_PHONE_NUMBER
  });
  
  const client = getTwilioClient();
  if (!client) {
    console.warn('❌ SMS DEBUG: Twilio credentials not configured');
    return null;
  }

  try {
    console.log('📱 SMS DEBUG: Creating Twilio message...');
    const message = await client.messages.create({
      body: options.body,
      from: options.from || process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });

    console.log('✅ SMS DEBUG: Message sent successfully:', {
      sid: message.sid,
      status: message.status
    });
    return message;
  } catch (error) {
    console.error('❌ SMS DEBUG: Error sending SMS via Twilio:', error);
    throw error;
  }
}

export async function makeVoiceCall(options: TwilioVoiceOptions) {
  const client = getTwilioClient();
  if (!client) {
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
  customMessage?: string,
  selectedChapters?: string[],
  inviteCode?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app';
  
  // Format phone number for Twilio (E.164 format)
  let formattedPhone = personPhone.trim();
  if (formattedPhone.startsWith('0')) {
    // UK number starting with 0, replace with +44
    formattedPhone = '+44' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('+')) {
    // Add + if missing
    formattedPhone = '+' + formattedPhone;
  }
  
  console.log('📱 SMS DEBUG: Phone number formatting:', {
    original: personPhone,
    formatted: formattedPhone
  });
  
  // Resolve chapter IDs to names
  let chapterNames: string[] = [];
  if (selectedChapters && selectedChapters.length > 0) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase-server');
      const { data: chapters, error } = await supabaseAdmin
        .from('timezones')
        .select('id, title')
        .in('id', selectedChapters);
      
      if (error) {
        console.error('❌ SMS DEBUG: Error fetching chapter names:', error);
        chapterNames = selectedChapters; // Fallback to IDs if fetch fails
      } else {
        chapterNames = chapters?.map(chapter => chapter.title) || selectedChapters;
        console.log('📱 SMS DEBUG: Resolved chapter names:', chapterNames);
      }
    } catch (error) {
      console.error('❌ SMS DEBUG: Error resolving chapter names:', error);
      chapterNames = selectedChapters; // Fallback to IDs if fetch fails
    }
  }
  
  const chapterText = chapterNames.length > 0
    ? ` I'd love your help with these chapters: ${chapterNames.join(', ')}.`
    : '';
  
  const inviteCodeText = inviteCode 
    ? ` Invite code: ${inviteCode} (save this to join later or if using a different phone/email)`
    : '';
  
  const message = `Hi ${personName}! ${inviterName} (your ${relationship}) invited you to join This Is Me - a memory collaboration platform.${chapterText} ${customMessage ? `"${customMessage}" ` : ''}Join: ${appUrl}${inviteCodeText}`;

  return sendSMS({
    to: formattedPhone,
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
