import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia', // Hardcoded to match user's local Stripe error
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { price, description, customerName, customerEmail, customerPhone, categoryId, address, latitude, longitude, severity } = body;

    if (!description) {
      return NextResponse.json({ error: 'Missing required payment info' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your-stripe-secret-key')) {
      return NextResponse.json({ 
        error: 'Stripe is not configured. Please add your real STRIPE_SECRET_KEY to the .env file.' 
      }, { status: 500 });
    }

    const unitAmount = 1900; // €19.00 fixed dispatch fee
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session and embed form data in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Emergency Dispatch Fee',
              description: 'Labor and materials are paid directly to the handworker at the door.',
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual', // Hold funds
      },
      metadata: {
        customerName: customerName || '',
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        categoryId: categoryId || '',
        description: description ? description.substring(0, 500) : '',
        address: address || '',
        latitude: latitude ? String(latitude) : '',
        longitude: longitude ? String(longitude) : '',
        estimatedPrice: price ? String(price) : '0',
        severity: severity || 'MEDIUM',
      },
      success_url: `${appUrl}/request/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/request?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
