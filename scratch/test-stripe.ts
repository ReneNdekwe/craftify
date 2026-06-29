import Stripe from 'stripe';
import * as dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia' as any,
});

async function main() {
  console.log("Testing Stripe API with key:", process.env.STRIPE_SECRET_KEY?.substring(0, 15) + "...");
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Emergency Repair Request',
              description: 'Test',
            },
            unit_amount: 15000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',
      },
      metadata: {
        customerName: 'Test',
        customerEmail: 'Test',
        customerPhone: 'Test',
        categoryId: 'Test',
        description: 'Test',
        address: 'Test',
        latitude: 'Test',
        longitude: 'Test',
        price: '150',
        severity: 'MEDIUM',
      },
      success_url: `http://localhost:3000/request/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/request?canceled=true`,
    });
    console.log("SUCCESS! URL:", session.url);
  } catch (err: any) {
    console.error("STRIPE ERROR CAUGHT:", err.message);
  }
}

main();
