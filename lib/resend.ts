import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendResendEmail(options: ResendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured');
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || process.env.RESEND_FROM_EMAIL || 'noreply@yourcaio.co.uk',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html || '',
      text: options.text,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    throw error;
  }
}

export async function sendChapterInviteEmail(
  personEmail: string,
  chapterTitle: string,
  inviterName: string,
  customMessage?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const subject = `Collaborate on "${chapterTitle}" - This Is Me Chapter Invitation`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">This Is Me</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Memory Collaboration Platform by YourCaio</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-top: 0;">Chapter Collaboration Invitation</h2>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          Hi there! ${inviterName} has invited you to collaborate on their chapter:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
          <h3 style="color: #2563eb; margin: 0 0 10px 0;">"${chapterTitle}"</h3>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Collaborative Chapter</p>
        </div>
        
        ${customMessage ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="color: #374151; margin: 0; font-style: italic;">"${customMessage}"</p>
          </div>
        ` : ''}
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
          As a collaborator, you can:
        </p>
        
        <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
          <li>Add your own memories and photos to this chapter</li>
          <li>Comment on and enhance existing memories</li>
          <li>Share your unique perspective on shared experiences</li>
          <li>Help build a richer, more complete story together</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/join/${chapterTitle.toLowerCase().replace(/\s+/g, '-')}?invited=true" 
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          Join Chapter Collaboration
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          This invitation was sent by ${inviterName} via This Is Me
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
          Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
  
  const text = `
Hi there!

${inviterName} has invited you to collaborate on their chapter: "${chapterTitle}"

${customMessage ? `"${customMessage}"\n\n` : ''}
As a collaborator, you can:
- Add your own memories and photos to this chapter
- Comment on and enhance existing memories  
- Share your unique perspective on shared experiences
- Help build a richer, more complete story together

Join the collaboration: ${appUrl}/join/${chapterTitle.toLowerCase().replace(/\s+/g, '-')}?invited=true

This invitation was sent by ${inviterName} via This Is Me
Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
  `;

  return sendResendEmail({
    to: personEmail,
    subject,
    html,
    text,
  });
}

export async function sendPersonInviteEmail(
  personName: string,
  personEmail: string,
  inviterName: string,
  relationship: string,
  customMessage?: string,
  selectedChapters?: string[]
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Create contextual subject based on selected chapters
  const subject = selectedChapters && selectedChapters.length > 0 
    ? `Join me on This Is Me - Help with "${selectedChapters[0]}"${selectedChapters.length > 1 ? ` and ${selectedChapters.length - 1} other chapter${selectedChapters.length > 2 ? 's' : ''}` : ''}`
    : `Join me on This Is Me - Memory Collaboration Invitation`;
  
  // Create contextual opening based on selected chapters
  const getContextualOpening = () => {
    if (!selectedChapters || selectedChapters.length === 0) {
      return `
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          I hope this message finds you well! I've been using This Is Me to capture and organize my life memories, and I'd love to have you be part of this journey.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          As my <strong>${relationship}</strong>, you hold a special place in my life, and I believe your perspective and contributions would make my memory collection even more meaningful.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          I'd love to collaborate with you on specific chapters of my life story, where you can add your own memories, photos, and perspectives to help build a richer, more complete picture of our shared experiences.
        </p>`;
    } else if (selectedChapters.length === 1) {
      const chapter = selectedChapters[0];
      return `
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          Hi ${personName}! I hope this message finds you well. I've been working on a special chapter of my life story called <strong>"${chapter}"</strong> and I'd love for you to be part of it.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          As my <strong>${relationship}</strong>, you have such an important perspective on this part of my life, and I believe your memories, photos, and stories would make this chapter so much richer and more complete.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          I'd love for you to help me build this chapter by adding your own memories, photos, and perspectives about our shared experiences during this time.
        </p>`;
    } else {
      return `
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          Hi ${personName}! I hope this message finds you well. I've been working on several special chapters of my life story and I'd love for you to be part of them.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          As my <strong>${relationship}</strong>, you have such an important perspective on these parts of my life, and I believe your memories, photos, and stories would make these chapters so much richer and more complete.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          I'd love for you to help me build these chapters by adding your own memories, photos, and perspectives about our shared experiences during these times.
        </p>`;
    }
  };
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">This Is Me</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Memory Collaboration Platform by YourCaio</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hi ${personName}!</h2>
        
        ${getContextualOpening()}
        
        ${customMessage ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="color: #374151; margin: 0; font-style: italic;">"${customMessage}"</p>
          </div>
        ` : ''}
        
        ${selectedChapters && selectedChapters.length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
            <h3 style="color: #2563eb; margin: 0 0 15px 0; font-size: 18px;">${selectedChapters.length === 1 ? 'The Chapter I\'d Love Your Help With:' : 'The Chapters I\'d Love Your Help With:'}</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px; margin: 0;">
              ${selectedChapters.map(chapter => `<li style="margin-bottom: 8px;"><strong>${chapter}</strong></li>`).join('')}
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0;">
              You'll be able to add your own memories, photos, and stories to ${selectedChapters.length === 1 ? 'this chapter' : 'these chapters'} once you join.
            </p>
          </div>
        ` : ''}
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
          This Is Me allows us to:
        </p>
        
        <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
          <li>Collaborate on specific life chapters together</li>
          <li>Add your own photos, stories, and perspectives</li>
          <li>Comment on and enhance existing memories</li>
          <li>Create a shared timeline of our experiences</li>
          <li>Build richer, more complete life stories together</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/auth/register?invite=${encodeURIComponent(personEmail)}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Join This Is Me
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          This invitation was sent by ${inviterName} via This Is Me
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
          Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
  
  // Create contextual text version based on selected chapters
  const getContextualTextOpening = () => {
    if (!selectedChapters || selectedChapters.length === 0) {
      return `I hope this message finds you well! I've been using This Is Me to capture and organize my life memories, and I'd love to have you be part of this journey.

As my ${relationship}, you hold a special place in my life, and I believe your perspective and contributions would make my memory collection even more meaningful.

I'd love to collaborate with you on specific chapters of my life story, where you can add your own memories, photos, and perspectives to help build a richer, more complete picture of our shared experiences.`;
    } else if (selectedChapters.length === 1) {
      const chapter = selectedChapters[0];
      return `I hope this message finds you well. I've been working on a special chapter of my life story called "${chapter}" and I'd love for you to be part of it.

As my ${relationship}, you have such an important perspective on this part of my life, and I believe your memories, photos, and stories would make this chapter so much richer and more complete.

I'd love for you to help me build this chapter by adding your own memories, photos, and perspectives about our shared experiences during this time.`;
    } else {
      return `I hope this message finds you well. I've been working on several special chapters of my life story and I'd love for you to be part of them.

As my ${relationship}, you have such an important perspective on these parts of my life, and I believe your memories, photos, and stories would make these chapters so much richer and more complete.

I'd love for you to help me build these chapters by adding your own memories, photos, and perspectives about our shared experiences during these times.`;
    }
  };

  const text = `
Hi ${personName}!

${getContextualTextOpening()}

${customMessage ? `\n"${customMessage}"\n` : ''}

${selectedChapters && selectedChapters.length > 0 ? `
${selectedChapters.length === 1 ? 'The Chapter I\'d Love Your Help With:' : 'The Chapters I\'d Love Your Help With:'}
${selectedChapters.map(chapter => `• ${chapter}`).join('\n')}

You'll be able to add your own memories, photos, and stories to ${selectedChapters.length === 1 ? 'this chapter' : 'these chapters'} once you join.

` : ''}

This Is Me allows us to:
- Collaborate on specific life chapters together
- Add your own photos, stories, and perspectives  
- Comment on and enhance existing memories
- Create a shared timeline of our experiences
- Build richer, more complete life stories together

Join me: ${appUrl}/auth/register?invite=${encodeURIComponent(personEmail)}

This invitation was sent by ${inviterName} via This Is Me
Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
  `;

  return sendResendEmail({
    to: personEmail,
    subject,
    html,
    text,
  });
}

export async function sendPersonInviteSMS(
  personName: string,
  personPhone: string,
  inviterName: string,
  relationship: string,
  customMessage?: string,
  selectedChapters?: string[]
) {
  // This will be implemented with Twilio
  const chapterText = selectedChapters && selectedChapters.length > 0 
    ? ` I'd love your help with these chapters: ${selectedChapters.join(', ')}.`
    : '';
  const message = `Hi ${personName}! ${inviterName} (your ${relationship}) invited you to join This Is Me - a memory collaboration platform.${chapterText} ${customMessage ? `"${customMessage}" ` : ''}Join: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;
  
  // For now, return a placeholder - this will be implemented with Twilio
  console.log('SMS would be sent:', { to: personPhone, message });
  return { success: true, message: 'SMS placeholder' };
}
