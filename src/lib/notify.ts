// Email and in-app notices for ticket events (S4-10).
//
// Writing a notice and queuing its email happen in the database (notify_ticket_event, migration
// 0027), which also decides who is told. This file only sends the queued emails through Resend.
// It never holds the service-role key. Email carries the reference, the title and a link only,
// never the text of the request.

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export type NotifyEvent = "received" | "needs_approval" | "decided" | "reply_sent";

type Client = Awaited<ReturnType<typeof createClient>>;

// Queues the notices and emails for one event, then tries to send the emails now.
// It never throws: a failed notification must not stop the request or the reply.
export async function notifyTicketEvent(supabase: Client, ticketId: number, event: NotifyEvent) {
  const { error } = await supabase.rpc("notify_ticket_event", { p_ticket_id: ticketId, p_event: event });
  if (error) {
    console.error("Could not queue the notification:", error.message);
    return;
  }
  await sendPendingEmails(supabase);
}

// Sends the emails waiting in the outbox. With no Resend key, nothing is sent: the notices
// stay in the app (the fallback), and the emails wait until email is switched on.
export async function sendPendingEmails(supabase: Client): Promise<{ sent: number; note?: string }> {
  const secret = process.env.CRON_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) {
    return { sent: 0, note: "Email is not switched on. Notices are in the app only." };
  }

  const { data: rows, error } = await supabase.rpc("take_pending_emails", { p_secret: secret });
  if (error || !rows) {
    console.error("Could not read the email outbox:", error?.message);
    return { sent: 0 };
  }

  const resend = new Resend(apiKey);
  const appUrl = process.env.APP_URL ?? "https://relay-gilt-nine.vercel.app";
  const from = process.env.RESEND_FROM ?? "Relay <onboarding@resend.dev>";
  const sentIds: number[] = [];

  for (const row of rows) {
    const link = `${appUrl}${row.link_path}`;
    const { error: sendError } = await resend.emails.send({
      from,
      to: row.to_email,
      subject: row.subject,
      html:
        `<p>${escapeHtml(row.title)}</p>` +
        `<p>Reference: <strong>${escapeHtml(row.reference)}</strong></p>` +
        `<p><a href="${escapeHtml(link)}">Open in Relay</a></p>`,
    });
    if (sendError) {
      // Left unsent, so the next attempt tries it again.
      console.error("Email not sent, will try again:", sendError.message);
      continue;
    }
    sentIds.push(row.outbox_id);
  }

  if (sentIds.length > 0) {
    await supabase.rpc("mark_emails_sent", { p_secret: secret, p_ids: sentIds });
  }
  return { sent: sentIds.length };
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
