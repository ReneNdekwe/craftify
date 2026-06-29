import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cancelPaymentIntent } from '@/lib/stripe';

// This would typically be triggered by a cron job (e.g. Supabase pg_cron, Vercel Cron, or n8n)
// every 5 minutes to clean up stale jobs.
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Find jobs that have been OPEN for more than 20 minutes
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: staleJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'OPEN')
      .lt('created_at', twentyMinsAgo);

    if (error) {
      console.error('Failed to fetch stale jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch stale jobs' }, { status: 500 });
    }

    if (!staleJobs || staleJobs.length === 0) {
      return NextResponse.json({ message: 'No stale jobs found' });
    }

    const cancelledIds = [];
    const errors = [];

    for (const job of staleJobs) {
      try {
        // 1. Cancel the Stripe Authorization hold
        if (job.stripe_payment_intent_id) {
          await cancelPaymentIntent(job.stripe_payment_intent_id);
        }

        // 2. Mark the job as CANCELLED
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ status: 'CANCELLED' })
          .eq('id', job.id);

        if (updateError) throw updateError;
        
        cancelledIds.push(job.id);
      } catch (err: any) {
        console.error(`Failed to cancel job ${job.id}:`, err);
        errors.push({ id: job.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      cancelledCount: cancelledIds.length,
      cancelledIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Auto-cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
