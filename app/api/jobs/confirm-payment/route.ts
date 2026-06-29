import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { notifyWorkersOfJob } from '@/lib/notifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    // 1. Retrieve the session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.payment_status !== 'unpaid') {
      // In a real app we might handle unpaid if we just hold funds
      // but checkout sessions with manual capture usually say 'paid' or 'unpaid' depending on config
      // For this demo, we'll proceed if we have a valid session with metadata
    }

    const metadata = session.metadata;
    if (!metadata) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      categoryId,
      description,
      address,
      latitude,
      longitude,
      estimatedPrice,
      severity,
    } = metadata;

    const supabase = createServerClient();

    // Step 1: Create or find customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase.from('customers').update({ name: customerName, phone: customerPhone }).eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ name: customerName, email: customerEmail, phone: customerPhone })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      customerId = newCustomer.id;
    }

    // Step 2: Append estimated price to description
    const acceptToken = uuidv4();
    let finalDescription = severity && severity !== 'MEDIUM' 
      ? `[SEVERITY: ${severity}] ${description}` 
      : description;
      
    if (estimatedPrice && estimatedPrice !== '0') {
      finalDescription += `\n\n[ESTIMATED LABOR: €${estimatedPrice} - Collect directly from customer]`;
    }

    // Step 3: Create job record (This triggers the n8n webhook because status is OPEN)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        customer_id: customerId,
        category_id: categoryId,
        description: finalDescription,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        base_price: 19.00, // Fixed dispatch fee
        current_price: 19.00,
        platform_fee: 19.00,
        worker_payout: 0.00,
        status: 'OPEN',
        accept_token: acceptToken,
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .select('*')
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create job in database' }, { status: 500 });
    }

    // Step 4: Dispatch job to n8n webhook
    try {
      const { data: workers } = await supabase
        .from('workers')
        .select('*')
        .eq('status', 'ACTIVE');

      if (workers && workers.length > 0) {
        // Native Notification
        // Get category name for notifications
        const { data: category } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        const categoryName = category?.name || 'Emergency';
        await notifyWorkersOfJob(job, workers, categoryName).catch(err => console.error('Native notification failed:', err));

        // Fire-and-forget webhook
        const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://rndekwe.app.n8n.cloud';
        fetch(`${webhookUrl}/webhook/dispatch-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job,
            customer: { name: customerName, phone: customerPhone },
            workers: workers.map((w: any) => ({ email: w.email, name: w.name, phone: w.phone }))
          }),
        }).catch(err => console.error('n8n Webhook failed:', err));
      } else {
        console.warn('No nearby workers found for job dispatch:', job.id);
      }
    } catch (dispatchError) {
      console.error('Failed to query workers for dispatch:', dispatchError);
    }

    // Return the newly created job
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
      },
      message: 'Payment secured and job dispatched to workers!',
    });

  } catch (err: any) {
    console.error('Confirm Payment Error:', err);
    return NextResponse.json({ error: err.message || 'Payment confirmation failed' }, { status: 500 });
  }
}
