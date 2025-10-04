import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export async function sendEmail(options: EmailOptions) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured');
    return null;
  }

  try {
    const msg: any = {
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL || 'support@yourapp.com',
      subject: options.subject,
    };

    // Use template or content
    if (options.templateId) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData || {};
    } else {
      // Use content array for non-template emails
      const content = [];
      if (options.text) {
        content.push({ type: 'text/plain', value: options.text });
      }
      if (options.html) {
        content.push({ type: 'text/html', value: options.html });
      }
      if (content.length > 0) {
        msg.content = content;
      }
    }

    const response = await sgMail.send(msg);
    return response[0];
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendTicketNotification(
  type: 'created' | 'commented' | 'status_changed' | 'assigned' | 'resolved',
  ticketData: {
    id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    creator?: { email: string };
    assignee?: { email: string };
  },
  recipientEmail: string,
  additionalData?: Record<string, any>
) {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app';
  const ticketUrl = `${appUrl}/support/tickets/${ticketData.id}`;

  const subjects = {
    created: `New ticket created: ${ticketData.title}`,
    commented: `New comment on ticket: ${ticketData.title}`,
    status_changed: `Ticket status updated: ${ticketData.title}`,
    assigned: `Ticket assigned to you: ${ticketData.title}`,
    resolved: `Ticket resolved: ${ticketData.title}`,
  };

  const htmlTemplates = {
    created: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Support Ticket Created</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">${ticketData.title}</h3>
          <p style="color: #666;">${ticketData.description || ''}</p>
          <div style="margin-top: 15px;">
            <span style="background: ${getPriorityColor(ticketData.priority)}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;">
              ${ticketData.priority?.toUpperCase()}
            </span>
          </div>
        </div>
        <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket
        </a>
      </div>
    `,
    commented: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Comment on Support Ticket</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">${ticketData.title}</h3>
          ${additionalData?.comment ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
              <p style="color: #666; margin: 0;">${additionalData.comment}</p>
            </div>
          ` : ''}
        </div>
        <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket
        </a>
      </div>
    `,
    status_changed: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Status Updated</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">${ticketData.title}</h3>
          <p style="color: #666;">
            Status changed to: <strong>${ticketData.status?.replace('_', ' ')}</strong>
          </p>
        </div>
        <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket
        </a>
      </div>
    `,
    assigned: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Assigned to You</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">${ticketData.title}</h3>
          <p style="color: #666;">${ticketData.description || ''}</p>
          <div style="margin-top: 15px;">
            <span style="background: ${getPriorityColor(ticketData.priority)}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;">
              ${ticketData.priority?.toUpperCase()}
            </span>
          </div>
        </div>
        <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket
        </a>
      </div>
    `,
    resolved: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Resolved</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #22c55e; margin-top: 0;">✓ ${ticketData.title}</h3>
          <p style="color: #666;">Your support ticket has been resolved.</p>
        </div>
        <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Ticket
        </a>
      </div>
    `,
  };

  return sendEmail({
    to: recipientEmail,
    subject: subjects[type],
    html: htmlTemplates[type],
    text: `${subjects[type]}\n\nView ticket: ${ticketUrl}`,
  });
}

function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}