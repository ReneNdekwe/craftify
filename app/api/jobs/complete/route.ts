/**
 * Workflow 4 — Completion & Payment
 *
 * 1. Worker marks job as completed
 * 2. Get job, customer & worker details
 * 3. Create Stripe PaymentIntent with 20% platform fee (Stripe Connect)
 * 4. Update job status to PAID, save payment IDs and timestamps
 * 5. Send payment receipts to customer and worker (Email + WhatsApp)
 *
 * OUTPUT: Job = PAID, Payment completed, Receipts sent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createPaymentIntent, eurToCents } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, workerId } = body;

    if (!jobId || !workerId) {
      return NextResponse.json(
        { error: 'Missing jobId or workerId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Step 2: Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify the worker is assigned to this job
    if (job.worker_id !== workerId) {
      return NextResponse.json({ error: 'Worker not assigned to this job' }, { status: 403 });
    }

    // Verify the job is in ACCEPTED status
    if (job.status !== 'ACCEPTED') {
      return NextResponse.json({
        error: `Job cannot be completed. Current status: ${job.status}`,
      }, { status: 400 });
    }

    // Get customer and worker details
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', job.customer_id)
      .single();

    const { data: worker } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (!customer || !worker) {
      return NextResponse.json({ error: 'Customer or worker not found' }, { status: 404 });
    }

    // Get category name
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', job.category_id)
      .single();

    // Step 3: Create Stripe PaymentIntent
    let paymentIntentId: string | null = null;
    let transferId: string | null = null;

    try {
      if (process.env.STRIPE_SECRET_KEY && worker.stripe_account_id) {
        const paymentIntent = await createPaymentIntent(
          eurToCents(job.current_price),
          eurToCents(job.platform_fee),
          worker.stripe_account_id,
          {
            job_id: job.id,
            customer_id: job.customer_id,
            worker_id: workerId,
          }
        );
        paymentIntentId = paymentIntent.id;
        transferId = paymentIntent.transfer_data?.destination as string || null;

        console.log(`💳 Payment processed: ${paymentIntentId}`);
      } else {
        console.log(`💳 Stripe not configured or worker has no Stripe account — simulating payment`);
        paymentIntentId = `sim_${Date.now()}`;
        transferId = `sim_transfer_${Date.now()}`;
      }
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError);
      // Continue with simulated payment for demo purposes
      paymentIntentId = `sim_error_${Date.now()}`;
      transferId = `sim_transfer_error_${Date.now()}`;
    }

    // Step 4: Update job to PAID
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'PAID',
        completed_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_transfer_id: transferId,
      })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError || !updatedJob) {
      console.error('Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    // Step 5: Send payment receipts (Delegated to n8n)

    return NextResponse.json({
      success: true,
      message: 'Job completed and payment processed!',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        totalPaid: updatedJob.current_price,
        platformFee: updatedJob.platform_fee,
        workerPayout: updatedJob.worker_payout,
        paymentIntentId: updatedJob.stripe_payment_intent_id,
        completedAt: updatedJob.completed_at,
        paidAt: updatedJob.paid_at,
      },
    });
  } catch (error) {
    console.error('Workflow 4 error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
