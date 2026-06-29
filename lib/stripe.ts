/**
 * Craftify Emergency — Stripe Client
 *
 * We use Auth & Capture:
 * - Customer authorizes €19 dispatch fee at checkout
 * - Captured when worker accepts the job
 * - Cancelled if no worker accepts in 20 mins
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
 * Capture a previously authorized PaymentIntent (e.g. the Dispatch Fee).
 */
export async function capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Cancel a previously authorized PaymentIntent (e.g. if no worker accepts).
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Convert EUR amount to cents for Stripe.
 */
export function eurToCents(amount: number): number {
  return Math.round(amount * 100);
}
