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
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app';
  
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

export async function sendMemoryInviteEmail({
  to,
  memoryTitle,
  memoryDescription,
  memoryImageUrl,
  inviterName,
  inviterEmail,
  message,
  reason,
  permissions,
  memoryId
}: {
  to: string
  memoryTitle: string
  memoryDescription?: string
  memoryImageUrl?: string
  inviterName: string
  inviterEmail: string
  message?: string
  reason?: string
  permissions: string[]
  memoryId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app'
  
  const subject = `Collaborate on "${memoryTitle}" - Memory Invitation`
  
  // Map permission IDs to descriptions
  const permissionDescriptions: { [key: string]: string } = {
    'view': 'View this memory and its content',
    'comment': 'Add comments, additions, and corrections',
    'text': 'Edit and add text descriptions',
    'images': 'Upload and add photos to this memory'
  }
  
  const enabledPermissions = permissions.map(p => permissionDescriptions[p] || p).filter(Boolean)
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">This Is Me</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Memory Collaboration Platform by YourCaio</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-top: 0;">Memory Collaboration Invitation</h2>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          Hi there! ${inviterName} has invited you to collaborate on their memory:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
          <div style="display: flex; align-items: start; gap: 15px;">
            ${memoryImageUrl ? `
              <img src="${memoryImageUrl}" alt="${memoryTitle}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
            ` : ''}
            <div style="flex: 1;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">"${memoryTitle}"</h3>
              ${memoryDescription ? `
                <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">${memoryDescription}</p>
              ` : ''}
            </div>
          </div>
        </div>
        
        ${message ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="color: #374151; margin: 0; font-style: italic;">"${message}"</p>
          </div>
        ` : ''}
        
        ${reason ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
          </div>
        ` : ''}
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          As a collaborator, you can:
        </p>
        
        <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px; margin: 0;">
          ${enabledPermissions.map(permission => `<li>${permission}</li>`).join('')}
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/memories/${memoryId}?invited=true" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          View Memory & Accept Invitation
        </a>
      </div>
      
      <div style="background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 12px; margin: 30px 0;">
        <p style="color: #1e40af; margin: 0 0 10px 0; font-weight: 600; font-size: 14px; text-align: center;">
          Already have an account?
        </p>
        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.6; text-align: center;">
          Simply click the button above while logged in to accept the invitation.<br>
          You can also find pending invitations in the <strong>"Shared"</strong> tab of your dashboard.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          Invited by ${inviterName} via This Is Me
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
          Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `
  
  const text = `
Hi there!

${inviterName} has invited you to collaborate on their memory: "${memoryTitle}"

${memoryDescription ? `Description: ${memoryDescription}\n` : ''}

${message ? `"${message}"\n` : ''}

${reason ? `Reason: ${reason}\n` : ''}

As a collaborator, you can:
${enabledPermissions.map(permission => `• ${permission}`).join('\n')}

View and accept invitation: ${appUrl}/memories/${memoryId}?invited=true

Already have an account?
Simply click the link above while logged in to accept the invitation.
You can also find pending invitations in the "Shared" tab of your dashboard.

This invitation was sent by ${inviterName} via This Is Me
Powered by YourCaio • If you didn't expect this invitation, you can safely ignore this email.
  `

  return sendResendEmail({
    to,
    subject,
    html,
    text,
  })
}

export async function sendPersonInviteEmail(
  personName: string,
  personEmail: string,
  inviterName: string,
  relationship: string,
  customMessage?: string,
  selectedChapters?: string[],
  inviteCode?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app';
  
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
        console.error('❌ EMAIL DEBUG: Error fetching chapter names:', error);
        chapterNames = selectedChapters; // Fallback to IDs if fetch fails
      } else {
        chapterNames = chapters?.map(chapter => chapter.title) || selectedChapters;
        console.log('📧 EMAIL DEBUG: Resolved chapter names:', chapterNames);
      }
    } catch (error) {
      console.error('❌ EMAIL DEBUG: Error resolving chapter names:', error);
      chapterNames = selectedChapters; // Fallback to IDs if fetch fails
    }
  }
  
  // Create contextual subject based on selected chapters
  const subject = chapterNames.length > 0 
    ? `Join me on This Is Me - Help with "${chapterNames[0]}"${chapterNames.length > 1 ? ` and ${chapterNames.length - 1} other chapter${chapterNames.length > 2 ? 's' : ''}` : ''}`
    : `Join me on This Is Me - Memory Collaboration Invitation`;
  
  // Create contextual opening based on selected chapters
  const getContextualOpening = () => {
    if (!chapterNames || chapterNames.length === 0) {
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
    } else if (chapterNames.length === 1) {
      const chapter = chapterNames[0];
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
        
        ${chapterNames.length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
            <h3 style="color: #2563eb; margin: 0 0 15px 0; font-size: 18px;">${chapterNames.length === 1 ? 'The Chapter I\'d Love Your Help With:' : 'The Chapters I\'d Love Your Help With:'}</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px; margin: 0;">
              ${chapterNames.map(chapter => `<li style="margin-bottom: 8px;"><strong>${chapter}</strong></li>`).join('')}
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0;">
              You'll be able to add your own memories, photos, and stories to ${chapterNames.length === 1 ? 'this chapter' : 'these chapters'} once you join.
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
      
      ${inviteCode ? `
        <div style="background: #f0f9ff; border: 2px solid #0ea5e9; padding: 25px; border-radius: 12px; margin: 30px 0;">
          <p style="color: #0c4a6e; margin: 0 0 15px 0; font-weight: 600; font-size: 16px; text-align: center;">
            📋 Your Invite Code
          </p>
          <div style="background: white; padding: 20px 15px; border-radius: 8px; border: 3px dashed #0ea5e9; text-align: center; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0369a1; letter-spacing: 4px; font-family: 'Courier New', monospace;">
              ${inviteCode}
            </p>
          </div>
          <p style="color: #0c4a6e; font-size: 13px; margin: 0; line-height: 1.6; text-align: center;">
            Already have an account or signing up with a different email?<br>
            Go to <strong>Settings → Redeem Invite Code</strong> after logging in.
          </p>
        </div>
      ` : ''}
      
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
    if (!chapterNames || chapterNames.length === 0) {
      return `I hope this message finds you well! I've been using This Is Me to capture and organize my life memories, and I'd love to have you be part of this journey.

As my ${relationship}, you hold a special place in my life, and I believe your perspective and contributions would make my memory collection even more meaningful.

I'd love to collaborate with you on specific chapters of my life story, where you can add your own memories, photos, and perspectives to help build a richer, more complete picture of our shared experiences.`;
    } else if (chapterNames.length === 1) {
      const chapter = chapterNames[0];
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

${chapterNames.length > 0 ? `
${chapterNames.length === 1 ? 'The Chapter I\'d Love Your Help With:' : 'The Chapters I\'d Love Your Help With:'}
${chapterNames.map(chapter => `• ${chapter}`).join('\n')}

You'll be able to add your own memories, photos, and stories to ${chapterNames.length === 1 ? 'this chapter' : 'these chapters'} once you join.

` : ''}

This Is Me allows us to:
- Collaborate on specific life chapters together
- Add your own photos, stories, and perspectives  
- Comment on and enhance existing memories
- Create a shared timeline of our experiences
- Build richer, more complete life stories together

Join me: ${appUrl}/auth/register?invite=${encodeURIComponent(personEmail)}

${inviteCode ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR INVITE CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${inviteCode}

Already have an account or signing up with a different email?
Go to Settings → Redeem Invite Code after logging in.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : ''}

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

