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
import { sendPaymentReceipts } from '@/lib/notifications';

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

    // Step 3: Update job to PAID
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'PAID',
        completed_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError || !updatedJob) {
      console.error('Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    // Step 4: Send notifications (Native fallback)
    await sendPaymentReceipts(updatedJob, customer, worker, category?.name || 'Emergency')
      .catch(err => console.error('Native notification failed:', err));

    // Note: The n8n 'payment_receipts' workflow is automatically triggered 
    // by the Supabase database webhook (on UPDATE) when status changes to PAID.

    return NextResponse.json({
      success: true,
      message: 'Job completed! Worker collects payment at the door.',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        completedAt: updatedJob.completed_at,
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
