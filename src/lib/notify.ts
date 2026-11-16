import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface NotifyParams {
  userId: string;
  email: string;
  title: string;
  message: string;
  reference: string;
  link: string;
}

export async function sendNotification({ userId, email, title, message, reference, link }: NotifyParams) {
  // Respect the privacy rule: email carries reference, title, and link only, never the ticket text.
  const emailSubject = `Relay Notification: ${reference} - ${title}`;
  const emailHtml = `<p>You have a new update regarding ticket reference <strong>${reference}</strong>.</p><p><a href="${link}">View in Relay</a></p>`;

  if (resend && email) {
    try {
      await resend.emails.send({
        from: 'Relay Help Desk <noreply@relay.test>',
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });
      return;
    } catch (error) {
      console.error('Resend email failed, falling back to in-app notice:', error);
    }
  }

  // Fallback: Write full message and details to in-app notices table
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase.from('notices').insert({
    user_id: userId,
    title,
    message,
    link,
    read: false,
  });
}