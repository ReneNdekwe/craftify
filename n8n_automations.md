# n8n Automation Workflows

This document outlines the required n8n workflows that handle onboarding, notifications, payment receipts, and feedback collection for the Craftify Emergency app.

By offloading these tasks to n8n, the Next.js backend remains fast and responsive, while complex logic like sending emails, WhatsApp messages, and delayed tasks are visually manageable.

---

## 1. User Onboarding (Workers & Customers)
*This is the first step in the lifecycle before they can request or receive any jobs.*

**Trigger:** Supabase Trigger Node
- **Table:** `workers` OR `customers`
- **Event:** `INSERT`

**Workflow Logic (Workers):**
1. **Welcome Email:** Send a welcome email outlining how the platform works and what to expect.
2. **Slack/Discord Alert:** HTTP Request Node to send a message to the internal admin team so they can review the new worker's documentation.

**Workflow Logic (Customers):**
1. **Welcome Email:** Send a welcome email explaining how they can request emergency help and track jobs.

---

## 2. Worker Notifications (Email & WhatsApp)
*Replaces synchronous notification dispatch in `create` and `escalate` routes when a new job is created.*

**Trigger:** Supabase Trigger Node
- **Table:** `jobs`
- **Event:** `INSERT` and `UPDATE` (where `status = 'OPEN'`)

**Workflow Logic:**
1. **Fetch Nearby Workers:** Use the Postgres Node to call the `find_nearby_workers` RPC using the job's latitude, longitude, and category.
2. **Fallback:** If no workers are found, fetch all workers where `status = 'ACTIVE'`.
3. **Loop:** Use an Item Lists/Loop Node to iterate through workers.
4. **WhatsApp Alert:** Twilio Node to send a WhatsApp message to each worker.
5. **Email Alert:** Resend/SMTP Node to send an HTML email with the Job Accept link.

---

## 3. Customer Acceptance Alert
*Replaces synchronous `notifyCustomerJobAccepted` in `accept` route. Triggered when a worker accepts the job.*

**Trigger:** Supabase Trigger Node
- **Table:** `jobs`
- **Event:** `UPDATE`
- **Condition:** `status` changed to `ACCEPTED`

**Workflow Logic:**
1. **Fetch Worker Info:** Supabase Node to get worker details (`worker_id`).
2. **Fetch Customer Info:** Supabase Node to get customer details (`customer_id`).
3. **WhatsApp Alert:** Twilio Node to message the customer that their worker is on the way.
4. **Email Alert:** Resend/SMTP Node.

---

## 4. Payment Processing & Receipts
*Replaces synchronous `sendPaymentReceipts` in `complete` route. Triggered once the job is completed and paid.*

**Trigger:** Supabase Trigger Node
- **Table:** `jobs`
- **Event:** `UPDATE`
- **Condition:** `status` changed to `PAID`

*Alternative Trigger: Stripe Webhook Node (Event: `checkout.session.completed`)*

**Workflow Logic:**
1. **Fetch Job/Customer/Worker Data:** Supabase Node.
2. **Customer Receipt:** Send Email/WhatsApp confirming payment of the full price.
3. **Worker Payout Alert:** Send Email/WhatsApp confirming their expected payout (Current Price - Platform Fee).

---

## 5. Post-Job Customer Feedback
*Triggered after the job has been completed to gather service feedback.*

**Trigger:** Supabase Trigger Node
- **Table:** `jobs`
- **Event:** `UPDATE`
- **Condition:** `status` changed to `COMPLETED` or `PAID`

**Workflow Logic:**
1. **Wait:** Wait Node (e.g., Wait 2 hours).
2. **Fetch Details:** Ensure the job was not refunded or disputed.
3. **Send Survey:** Resend/SMTP Node to send the customer a Typeform/Tally link asking them to rate the worker out of 5 stars.
