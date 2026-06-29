/**
 * Workflow 2 — Accept Job
 *
 * 1. Worker clicks Accept link (GET with token)
 * 2. Retrieve job from Supabase
 * 3. Check if job is still OPEN
 *    - YES: Assign worker, change status to ACCEPTED, save timestamps
 *    - NO: Respond "This job has already been accepted"
 * 4. Notify customer with worker details (Email + WhatsApp)
 * 5. Send success response to worker
 *
 * OUTPUT: Job = ACCEPTED, Customer & Worker notified
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { capturePaymentIntent } from '@/lib/stripe';
import { notifyCustomerJobAccepted } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { acceptToken, workerId } = body;

    if (!acceptToken || !workerId) {
      return NextResponse.json(
        { error: 'Missing acceptToken or workerId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Step 2: Retrieve job by accept token
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('accept_token', acceptToken)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Step 3: Check if job is still OPEN (first-come-first-served)
    if (job.status !== 'OPEN') {
      return NextResponse.json({
        success: false,
        alreadyTaken: true,
        message: 'This job has already been accepted.',
      }, { status: 409 });
    }

    // Verify the worker exists and is active
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('status', 'ACTIVE')
      .single();

    if (workerError || !worker) {
      return NextResponse.json(
        { error: 'Worker not found or inactive' },
        { status: 404 }
      );
    }

    // Step 4: Atomic update — assign worker and change status
    // Use a conditional update to prevent race conditions
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        worker_id: workerId,
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'OPEN') // Only update if still OPEN (race condition protection)
      .select('*')
      .single();

    if (updateError || !updatedJob) {
      // Another worker beat them to it
      return NextResponse.json({
        success: false,
        alreadyTaken: true,
        message: 'This job has already been accepted.',
      }, { status: 409 });
    }

    // Get customer details
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', job.customer_id)
      .single();

    // Get category name
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', job.category_id)
      .single();

    // Step 5: Capture the Dispatch Fee
    if (job.stripe_payment_intent_id) {
      try {
        await capturePaymentIntent(job.stripe_payment_intent_id);
        console.log(`Successfully captured dispatch fee for job ${job.id}`);
      } catch (stripeError) {
        console.error('Failed to capture payment intent:', stripeError);
        // We log the error but don't fail the request, the worker is already assigned.
        // We can manually capture later or build a retry mechanism.
      }
    }

    // Step 6: Notify customer with worker details (Native fallback)
    await notifyCustomerJobAccepted(updatedJob, customer, worker, category?.name || 'Emergency').catch(err => console.error('Native notification failed:', err));
    
    // Note: The n8n 'job_acceptance' workflow is automatically triggered 
    // by the Supabase database webhook (on UPDATE) when status changes to ACCEPTED.

    // Update worker stats
    await supabase
      .from('workers')
      .update({ jobs_completed: (worker.jobs_completed || 0) + 1 })
      .eq('id', workerId);

    return NextResponse.json({
      success: true,
      message: 'Job accepted successfully!',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        acceptedAt: updatedJob.accepted_at,
        currentPrice: updatedJob.current_price,
        workerPayout: updatedJob.worker_payout,
      },
    });
  } catch (error) {
    console.error('Workflow 2 error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
