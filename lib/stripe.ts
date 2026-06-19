/**
 * Craftify Emergency — Stripe Client
 *
 * Stripe Connect is used for split payments:
 * - 20% platform fee (retained by Craftify)
 * - 80% transferred to worker's connected Stripe account
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Create a PaymentIntent with application fee for Stripe Connect.
 *
 * @param amountCents - Total amount in cents
 * @param applicationFeeCents - Platform fee in cents (20%)
 * @param connectedAccountId - Worker's Stripe connected account ID
 * @param metadata - Additional metadata for the payment
 */
export async function createPaymentIntent(
  amountCents: number,
  applicationFeeCents: number,
  connectedAccountId: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    application_fee_amount: applicationFeeCents,
    transfer_data: {
      destination: connectedAccountId,
    },
    metadata: {
      platform: 'craftify_emergency',
      ...metadata,
    },
    // Auto-confirm for simplicity (in production, use client-side confirmation)
    confirm: true,
    payment_method: 'pm_card_visa', // Test card — remove in production
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  });
}

/**
 * Convert EUR amount to cents for Stripe.
 */
export function eurToCents(amount: number): number {
  return Math.round(amount * 100);
}
