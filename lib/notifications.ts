/**
 * Craftify Emergency — Notification Service
 *
 * Modular notification service with pluggable providers:
 * - ConsoleProvider: Logs to console (dev/testing)
 * - ResendProvider: Real email via Resend API
 * - TwilioProvider: Real WhatsApp via Twilio API
 *
 * Automatically selects the right provider based on environment variables.
 */

import { createServerClient, type Job, type Worker, type Customer } from './supabase';
import { Resend } from 'resend';

// ── Interfaces ──────────────────────────────────────────────

interface NotificationProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  sendWhatsApp(to: string, message: string): Promise<void>;
}

// ── Console Provider (Default/Dev) ──────────────────────────

class ConsoleProvider implements NotificationProvider {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log(`\n📧 EMAIL NOTIFICATION`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html.substring(0, 200)}...`);
    console.log('');
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    console.log(`\n💬 WHATSAPP NOTIFICATION`);
    console.log(`   To: ${to}`);
    console.log(`   Message: ${message.substring(0, 200)}...`);
    console.log('');
  }
}

// ── Resend Provider ─────────────────────────────────────────

class ResendProvider implements NotificationProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Craftify Emergency <noreply@craftify.app>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error(`Resend API error: ${JSON.stringify(error)}`);
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    // Resend doesn't support WhatsApp — fall back to console
    console.log(`💬 WhatsApp (via Resend fallback): ${to} — ${message.substring(0, 100)}`);
  }
}

// ── Twilio Provider ─────────────────────────────────────────

class TwilioProvider implements NotificationProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // Twilio doesn't handle email — fall back to console
    console.log(`📧 Email (via Twilio fallback): ${to} — ${subject}`);
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: this.fromNumber,
        To: `whatsapp:${to}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Twilio API error: ${error}`);
    }
  }
}

// ── Provider Factory ────────────────────────────────────────

function getEmailProvider(): NotificationProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendProvider(process.env.RESEND_API_KEY);
  }
  return new ConsoleProvider();
}

function getWhatsAppProvider(): NotificationProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return new TwilioProvider(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
    );
  }
  return new ConsoleProvider();
}

// ── High-level Notification Functions ───────────────────────

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Log a notification in the database.
 */
async function logNotification(
  jobId: string,
  channel: 'email' | 'whatsapp',
  notificationType: string,
  workerId?: string,
  customerId?: string,
  recipientEmail?: string,
  recipientPhone?: string,
  messagePreview?: string
) {
  try {
    const supabase = createServerClient();
    await supabase.from('job_notifications').insert({
      job_id: jobId,
      worker_id: workerId || null,
      customer_id: customerId || null,
      channel,
      notification_type: notificationType,
      recipient_email: recipientEmail || null,
      recipient_phone: recipientPhone || null,
      message_preview: messagePreview?.substring(0, 200) || null,
    });
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

/**
 * Notify workers about a new job (Workflow 1 — Dispatch).
 */
export async function notifyWorkersOfJob(
  job: Job,
  workers: Worker[],
  categoryName: string
): Promise<void> {
  const emailProvider = getEmailProvider();
  const whatsAppProvider = getWhatsAppProvider();

  for (const worker of workers) {
    const acceptLink = `${appUrl()}/accept/${job.accept_token}`;

    const subject = `🚨 Emergency ${categoryName} Job — €${job.current_price}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🚨 Emergency Job Available</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937;">Hi ${worker.name},</h2>
          <p style="color: #4b5563;">A new <strong>${categoryName}</strong> emergency job is available near you.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #6b7280;">Category</td><td style="padding: 8px; font-weight: 600;">${categoryName}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Address</td><td style="padding: 8px; font-weight: 600;">${job.address}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Payout</td><td style="padding: 8px; font-weight: 600; color: #059669;">€${job.worker_payout}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Description</td><td style="padding: 8px;">${job.description}</td></tr>
          </table>
          <a href="${acceptLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            ✅ Accept This Job
          </a>
          <p style="color: #9ca3af; margin-top: 16px; font-size: 12px;">First worker to accept wins. Price escalates every 5 minutes.</p>
        </div>
      </div>
    `;

    const whatsAppMsg = `🚨 *Emergency ${categoryName} Job*\n\n📍 ${job.address}\n💰 Your Payout: €${job.worker_payout}\n📝 ${job.description}\n\n✅ Accept now: ${acceptLink}\n\n⏰ First to accept wins!`;

    // Send both notifications
    await emailProvider.sendEmail(worker.email, subject, emailHtml);
    await whatsAppProvider.sendWhatsApp(worker.phone, whatsAppMsg);

    // Log notifications
    await logNotification(job.id, 'email', 'dispatch', worker.id, undefined, worker.email, undefined, subject);
    await logNotification(job.id, 'whatsapp', 'dispatch', worker.id, undefined, undefined, worker.phone, whatsAppMsg.substring(0, 200));
  }
}

/**
 * Notify customer that their job has been accepted (Workflow 2).
 */
export async function notifyCustomerJobAccepted(
  job: Job,
  customer: Customer,
  worker: Worker,
  categoryName: string
): Promise<void> {
  const emailProvider = getEmailProvider();
  const whatsAppProvider = getWhatsAppProvider();
  const jobLink = `${appUrl()}/job/${job.id}`;

  const subject = `✅ Your ${categoryName} request has been accepted!`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">✅ Help is on the way!</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937;">Hi ${customer.name},</h2>
        <p style="color: #4b5563;">Great news! A <strong>${categoryName}</strong> has accepted your emergency request.</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">Your Worker</h3>
          <p style="margin: 4px 0;"><strong>${worker.name}</strong></p>
          <p style="margin: 4px 0;">📧 ${worker.email}</p>
          <p style="margin: 4px 0;">📱 ${worker.phone}</p>
          <p style="margin: 4px 0;">⭐ Rating: ${worker.rating}/5</p>
        </div>
        <a href="${jobLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Track Your Job
        </a>
      </div>
    </div>
  `;

  const whatsAppMsg = `✅ *Help is on the way!*\n\nYour ${categoryName} request has been accepted by *${worker.name}*.\n\n📱 Contact: ${worker.phone}\n📧 Email: ${worker.email}\n\n🔗 Track: ${jobLink}`;

  await emailProvider.sendEmail(customer.email, subject, emailHtml);
  await whatsAppProvider.sendWhatsApp(customer.phone, whatsAppMsg);

  await logNotification(job.id, 'email', 'accepted', undefined, customer.id, customer.email, undefined, subject);
  await logNotification(job.id, 'whatsapp', 'accepted', undefined, customer.id, undefined, customer.phone, whatsAppMsg.substring(0, 200));
}

/**
 * Send payment receipts to both customer and worker (Workflow 4).
 */
export async function sendPaymentReceipts(
  job: Job,
  customer: Customer,
  worker: Worker,
  categoryName: string
): Promise<void> {
  const emailProvider = getEmailProvider();
  const whatsAppProvider = getWhatsAppProvider();

  // Customer receipt
  const customerSubject = `🧾 Payment Receipt — ${categoryName} Service`;
  const customerEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">🧾 Payment Receipt</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937;">Hi ${customer.name},</h2>
        <p style="color: #4b5563;">Your payment for the ${categoryName} service has been processed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #6b7280;">Service</td><td style="padding: 8px; font-weight: 600;">${categoryName}</td></tr>
          <tr><td style="padding: 8px; color: #6b7280;">Worker</td><td style="padding: 8px; font-weight: 600;">${worker.name}</td></tr>
          <tr><td style="padding: 8px; color: #6b7280;">Total Paid</td><td style="padding: 8px; font-weight: 600; color: #2563eb;">€${job.current_price}</td></tr>
          <tr><td style="padding: 8px; color: #6b7280;">Payment ID</td><td style="padding: 8px; font-size: 12px;">${job.stripe_payment_intent_id || 'N/A'}</td></tr>
        </table>
        <p style="color: #9ca3af; font-size: 12px;">Thank you for using Craftify Emergency!</p>
      </div>
    </div>
  `;

  const customerWhatsApp = `🧾 *Payment Receipt*\n\n${categoryName} service by ${worker.name}\n💰 Total: €${job.current_price}\n\nThank you for using Craftify Emergency!`;

  await emailProvider.sendEmail(customer.email, customerSubject, customerEmailHtml);
  await whatsAppProvider.sendWhatsApp(customer.phone, customerWhatsApp);

  await logNotification(job.id, 'email', 'receipt', undefined, customer.id, customer.email, undefined, customerSubject);
  await logNotification(job.id, 'whatsapp', 'receipt', undefined, customer.id, undefined, customer.phone, customerWhatsApp.substring(0, 200));

  // Worker receipt
  const workerSubject = `💰 Payment Received — €${job.worker_payout}`;
  const workerEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">💰 You Got Paid!</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937;">Hi ${worker.name},</h2>
        <p style="color: #4b5563;">Payment for your completed ${categoryName} job has been processed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #6b7280;">Job Total</td><td style="padding: 8px;">€${job.current_price}</td></tr>
          <tr><td style="padding: 8px; color: #6b7280;">Platform Fee (20%)</td><td style="padding: 8px;">-€${job.platform_fee}</td></tr>
          <tr style="border-top: 2px solid #e5e7eb;"><td style="padding: 8px; font-weight: 700;">Your Payout</td><td style="padding: 8px; font-weight: 700; color: #059669;">€${job.worker_payout}</td></tr>
        </table>
        <p style="color: #9ca3af; font-size: 12px;">The payout will be transferred to your connected Stripe account.</p>
      </div>
    </div>
  `;

  const workerWhatsApp = `💰 *You Got Paid!*\n\n${categoryName} job completed.\n💰 Your Payout: €${job.worker_payout}\n\nFunds will arrive in your Stripe account shortly.`;

  await emailProvider.sendEmail(worker.email, workerSubject, workerEmailHtml);
  await whatsAppProvider.sendWhatsApp(worker.phone, workerWhatsApp);

  await logNotification(job.id, 'email', 'receipt', worker.id, undefined, worker.email, undefined, workerSubject);
  await logNotification(job.id, 'whatsapp', 'receipt', worker.id, undefined, undefined, worker.phone, workerWhatsApp.substring(0, 200));
}
