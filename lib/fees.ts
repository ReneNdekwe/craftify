/**
 * Craftify Emergency — Fee Calculation
 *
 * Business Rules:
 * - Platform fee is always 20%
 * - Worker receives 80%
 * - Price escalation: +€75 every 5 minutes
 * - Maximum price: €900
 */

export const PLATFORM_FEE_RATE = 0.20;
export const WORKER_PAYOUT_RATE = 0.80;
export const ESCALATION_AMOUNT = 75.00;
export const MAX_PRICE = 900.00;

export interface FeeBreakdown {
  totalPrice: number;
  platformFee: number;
  workerPayout: number;
}

/**
 * Calculate fee breakdown for a given price.
 */
export function calculateFees(price: number): FeeBreakdown {
  const totalPrice = Math.round(price * 100) / 100;
  const platformFee = Math.round(totalPrice * PLATFORM_FEE_RATE * 100) / 100;
  const workerPayout = Math.round(totalPrice * WORKER_PAYOUT_RATE * 100) / 100;

  return { totalPrice, platformFee, workerPayout };
}

/**
 * Calculate the escalated price (capped at MAX_PRICE).
 */
export function escalatePrice(currentPrice: number): number {
  const newPrice = currentPrice + ESCALATION_AMOUNT;
  return Math.min(newPrice, MAX_PRICE);
}

/**
 * Check if a price can still be escalated.
 */
export function canEscalate(currentPrice: number): boolean {
  return currentPrice < MAX_PRICE;
}

/**
 * Format price for display (EUR).
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}
