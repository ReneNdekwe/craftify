/**
 * Workflow 3 — Price Escalation
 *
 * Triggered via cron (every 5 minutes) or manually via POST.
 *
 * 1. Find stale jobs (OPEN, older than 5 minutes since last escalation)
 * 2. For each stale job:
 *    - Raise price by €75 (max €900)
 *    - Recalculate 20% fee
 *    - Update job in Supabase
 *    - Re-find nearby workers and re-send notifications
 *
 * OUTPUT: Job = OPEN (Price Increased), Workers re-notified
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculateFees, escalatePrice, canEscalate } from '@/lib/fees';
import { notifyWorkersOfJob } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Step 1: Find stale jobs using the SQL function
    const { data: staleJobs, error: queryError } = await supabase
      .rpc('find_stale_jobs');

    if (queryError) {
      console.error('Stale jobs query error:', queryError);
      return NextResponse.json({ error: 'Failed to query stale jobs' }, { status: 500 });
    }

    if (!staleJobs || staleJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale jobs to escalate',
        escalatedCount: 0,
      });
    }

    let escalatedCount = 0;
    const results: Array<{ jobId: string; oldPrice: number; newPrice: number; workersNotified: number }> = [];

    // Step 2: Process each stale job
    for (const job of staleJobs) {
      if (!canEscalate(job.current_price)) {
        continue; // Already at max price
      }

      // Step 3: Raise price
      const newPrice = escalatePrice(job.current_price);
      const newFees = calculateFees(newPrice);

      // Step 4: Update job
      const { data: updatedJob, error: updateError } = await supabase
        .from('jobs')
        .update({
          current_price: newFees.totalPrice,
          platform_fee: newFees.platformFee,
          worker_payout: newFees.workerPayout,
          escalation_count: job.escalation_count + 1,
          last_escalated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'OPEN') // Only update if still OPEN
        .select('*')
        .single();

      if (updateError || !updatedJob) {
        console.error(`Failed to escalate job ${job.id}:`, updateError);
        continue;
      }

      // Step 5: Re-find nearby workers and re-send notifications
      const { data: workers } = await supabase
        .rpc('find_nearby_workers', {
          p_latitude: job.latitude,
          p_longitude: job.longitude,
          p_radius_km: 15.0,
          p_category_id: job.category_id,
        });

      // Get category name
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', job.category_id)
        .single();

      const notifiedWorkers = workers || [];
      if (notifiedWorkers.length > 0) {
        await notifyWorkersOfJob(updatedJob, notifiedWorkers, category?.name || 'Emergency');
      }

      escalatedCount++;
      results.push({
        jobId: job.id,
        oldPrice: job.current_price,
        newPrice: newFees.totalPrice,
        workersNotified: notifiedWorkers.length,
      });

      console.log(`📈 Escalated job ${job.id}: €${job.current_price} → €${newFees.totalPrice} (${notifiedWorkers.length} workers notified)`);
    }

    return NextResponse.json({
      success: true,
      message: `Escalated ${escalatedCount} job(s)`,
      escalatedCount,
      results,
    });
  } catch (error) {
    console.error('Workflow 3 error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
